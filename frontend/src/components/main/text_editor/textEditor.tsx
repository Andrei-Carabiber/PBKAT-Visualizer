import {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import * as vscode from 'vscode';
import {EditorApp, type EditorAppConfig} from 'monaco-languageclient/editorApp';
import {configureDefaultWorkerFactory} from 'monaco-languageclient/workerFactory';
import {MonacoVscodeApiWrapper, type MonacoVscodeApiConfig} from 'monaco-languageclient/vscodeApiWrapper';
import {LanguageClientWrapper, type LanguageClientConfig} from 'monaco-languageclient/lcwrapper';
import {
    RegisteredFileSystemProvider,
    RegisteredMemoryFile,
    registerFileSystemOverlay
} from "@codingame/monaco-vscode-files-service-override";
import getTextmateServiceOverride from '@codingame/monaco-vscode-textmate-service-override';
import getThemeServiceOverride from '@codingame/monaco-vscode-theme-service-override';
import getLanguagesServiceOverride from '@codingame/monaco-vscode-languages-service-override';
import getConfigurationServiceOverride, {
    updateUserConfiguration
} from '@codingame/monaco-vscode-configuration-service-override';

import '@codingame/monaco-vscode-theme-defaults-default-extension';
import CustomizationBar from "@/components/main/text_editor/customizationBar.tsx";
// Value import (not type-only): we need runtime members like
// monacoEditor.TrackedRangeStickiness and the Range class below, not just types.
import {editor as monacoEditor, KeyCode, KeyMod, Range} from '@codingame/monaco-vscode-editor-api'
import {useTheme} from "@/components/theme-provider";

import haskellGrammarRaw from './haskell.tmLanguage.json?raw';
import haskellLanguageConfigRaw from './haskell-language-configuration.json?raw';
import {
    buildFullSource,
    DEFAULT_USER_CODE,
    EDITABLE_END_MARKER,
    EDITABLE_START_MARKER,
} from './haskellBoilerplate';

export type editorSettings = {
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    letterSpacing: number;
    cursorStyle?: monacoEditor.IEditorOptions['cursorStyle']
    cursorBlinking?: monacoEditor.IEditorOptions['cursorBlinking']
    wordWrap?: monacoEditor.IEditorOptions['wordWrap']
    tabSize: number;
    smoothScrolling: boolean;
    automaticLayout: boolean;
}

export type MonacoEditorHandle = {
    /** Returns only the text the user is allowed to edit (between the sentinel markers). */
    getUserCode: () => string;
};

// Cast target for the (still real, but not always in the public .d.ts) hidden-areas API.
type HiddenAreasCapableEditor = monacoEditor.IStandaloneCodeEditor & {
    setHiddenAreas: (ranges: InstanceType<typeof Range>[]) => void;
};

function themeSettingFor(theme: string): string {
    if (theme === 'light') return 'Default Light Modern';
    if (theme === 'dark') return 'Default Dark Modern';
    // "system" (or anything else): fall back to the OS preference.
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'Default Dark Modern' : 'Default Light Modern';
}

// Single source of truth for the full VS Code "settings.json" document.
// updateUserConfiguration() REPLACES the whole configuration rather than
// merging into it, so every call — including theme-only updates — must pass
// the complete object or earlier settings (like minimap) silently vanish.
function buildUserConfigurationJson(theme: string): string {
    return JSON.stringify({
        'workbench.colorTheme': themeSettingFor(theme),

        'editor.wordBasedSuggestions': 'off',
        'editor.tabSize': 4,
        'editor.insertSpaces': true,

        'editor.cursorSmoothCaretAnimation': 'on',
        'editor.bracketPairColorization.enabled': true,

        'editor.renderLineHighlight': 'all',
        'editor.letterSpacing': 0.3,

        'editor.minimap.enabled': false
    });
}

/**
 * Locks the prelude/suffix boilerplate against edits and folds it out of view,
 * leaving only the region between the sentinel markers visible and editable.
 * Boundaries are tracked via sticky decorations so they keep up automatically
 * as the user's code grows or shrinks.
 */
// Navigation/no-op keys that are always safe to let through even when the
// selection currently reaches into a locked zone (arrow keys, paging, escape,
// bare modifier presses). Anything not in this set is treated as potentially
// content-modifying and gets blocked if the selection escapes editable bounds.
const ALWAYS_ALLOWED_KEYCODES = new Set<number>([
    KeyCode.LeftArrow, KeyCode.RightArrow,
    KeyCode.UpArrow, KeyCode.DownArrow,
    KeyCode.Home, KeyCode.End,
    KeyCode.PageUp, KeyCode.PageDown,
    KeyCode.Escape,
    KeyCode.Shift, KeyCode.Ctrl,
    KeyCode.Alt, KeyCode.Meta,
]);

function restrictToEditableRegion(editorInstance: monacoEditor.IStandaloneCodeEditor) {
    const model = editorInstance.getModel();
    if (!model) return;

    const startMatch = model.findMatches(EDITABLE_START_MARKER, false, false, true, null, false)[0];
    const endMatch = model.findMatches(EDITABLE_END_MARKER, false, false, true, null, false)[0];
    if (!startMatch || !endMatch) {
        console.warn('Editable region markers not found; skipping lock/hide setup.');
        return;
    }

    // Sticky decorations: Monaco keeps these ranges correct as content above/below
    // shifts, so we always know the *current* boundary, not the one at mount time.
    const lastLine = model.getLineCount();
    const [preludeDecorationId, suffixDecorationId] = model.deltaDecorations([], [
        {
            range: new Range(1, 1, startMatch.range.startLineNumber, 1),
            options: {stickiness: monacoEditor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges}
        },
        {
            range: new Range(endMatch.range.startLineNumber, 1, lastLine, model.getLineMaxColumn(lastLine)),
            options: {stickiness: monacoEditor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges}
        },
    ]);

    function currentBounds() {
        const preludeRange = model!.getDecorationRange(preludeDecorationId)!;
        const suffixRange = model!.getDecorationRange(suffixDecorationId)!;
        return {
            preludeRange,
            suffixRange,
            editableStartLine: preludeRange.endLineNumber + 1,
            editableEndLine: suffixRange.startLineNumber - 1,
        };
    }

    function applyHiddenAreas() {
        const {preludeRange, suffixRange} = currentBounds();
        (editorInstance as HiddenAreasCapableEditor).setHiddenAreas([preludeRange, suffixRange]);
    }

    function editableRangeNow(): InstanceType<typeof Range> {
        const {editableStartLine, editableEndLine} = currentBounds();
        return new Range(editableStartLine, 1, editableEndLine, model!.getLineMaxColumn(editableEndLine));
    }

    // A selection only counts as "safe" if it's strictly inside the editable
    // lines. A collapsed cursor sitting exactly on the first/last editable
    // line is still safe on its own, but Backspace/Delete there would merge
    // into the locked line next door, so those two are special-cased below.
    function selectionsAreSafe(): boolean {
        const {editableStartLine, editableEndLine} = currentBounds();
        return editorInstance.getSelections()?.every(sel =>
            sel.startLineNumber >= editableStartLine && sel.endLineNumber <= editableEndLine
        ) ?? false;
    }

    applyHiddenAreas();
    // Whenever the document legitimately changes (typing inside the editable
    // region shifts the suffix up/down), re-fold using the fresh boundary.
    model.onDidChangeContent(() => applyHiddenAreas());

    // Clamp Cmd/Ctrl+A to the editable range instead of selecting the whole file.
    editorInstance.addCommand(KeyMod.CtrlCmd | KeyCode.KeyA, () => {
        editorInstance.setSelection(editableRangeNow());
    });

    // Block any content-modifying keystroke whose selection reaches outside
    // the editable lines, *before* Monaco applies it — nothing gets edited,
    // nothing gets undone, hidden areas and tokenization are never disturbed.
    editorInstance.onKeyDown((event) => {
        if (ALWAYS_ALLOWED_KEYCODES.has(event.keyCode)) return;

        const {editableStartLine, editableEndLine} = currentBounds();
        const selections = editorInstance.getSelections() ?? [];
        const cursorAtStartBoundary = selections.some(sel =>
            sel.isEmpty() && sel.startLineNumber === editableStartLine && sel.startColumn === 1
        );
        const cursorAtEndBoundary = selections.some(sel => {
            const lastCol = model!.getLineMaxColumn(editableEndLine);
            return sel.isEmpty() && sel.endLineNumber === editableEndLine && sel.endColumn === lastCol;
        });

        const wouldEscape =
            !selectionsAreSafe() ||
            (cursorAtStartBoundary && event.keyCode === KeyCode.Backspace) ||
            (cursorAtEndBoundary && event.keyCode === KeyCode.Delete);

        if (wouldEscape) {
            event.preventDefault();
            event.stopPropagation();
        }
    });

    // Cut/Paste go through the clipboard API rather than keydown, so they need
    // their own guarded commands (same keybindings, checked against bounds first).
    editorInstance.addCommand(KeyMod.CtrlCmd | KeyCode.KeyV, async () => {
        if (!selectionsAreSafe()) return;
        const text = await navigator.clipboard.readText();
        const selections = editorInstance.getSelections() ?? [];
        editorInstance.executeEdits('paste-guard', selections.map(sel => ({range: sel, text})));
    });
    editorInstance.addCommand(KeyMod.CtrlCmd | KeyCode.KeyX, async () => {
        if (!selectionsAreSafe()) return;
        const selections = editorInstance.getSelections() ?? [];
        const text = selections.map(sel => model!.getValueInRange(sel)).join('\n');
        await navigator.clipboard.writeText(text);
        editorInstance.executeEdits('cut-guard', selections.map(sel => ({range: sel, text: ''})));
    });
}

function extractUserCode(model: monacoEditor.ITextModel): string {
    const startMatch = model.findMatches(EDITABLE_START_MARKER, false, false, true, null, false)[0];
    const endMatch = model.findMatches(EDITABLE_END_MARKER, false, false, true, null, false)[0];
    if (!startMatch || !endMatch) return model.getValue();

    const from = startMatch.range.startLineNumber + 1;
    const to = endMatch.range.startLineNumber - 1;
    if (to < from) return '';

    return model.getValueInRange(new Range(from, 1, to, model.getLineMaxColumn(to)));
}

const MonacoEditor = forwardRef<MonacoEditorHandle>((_props, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorRefInstance = useRef<monacoEditor.IStandaloneCodeEditor | undefined>(undefined);
    const initialized = useRef(false);
    const {theme} = useTheme();
    const [settings, setSettings] = useState<editorSettings>({
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        lineHeight: 22,
        letterSpacing: 0,
        cursorStyle: 'line',
        cursorBlinking: 'blink',
        wordWrap: 'off',
        tabSize: 4,
        smoothScrolling: true,
        automaticLayout: true,
    });

    useImperativeHandle(ref, () => ({
        getUserCode: () => {
            const model = editorRefInstance.current?.getModel();
            return model ? extractUserCode(model) : '';
        },
    }));

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const startEditor = async () => {
            const languageId = 'haskell';
            const initialHaskellCode = buildFullSource(DEFAULT_USER_CODE);

            const fileUri = vscode.Uri.file('/opt/pbkat/examples/P1.hs');
            const fileSystemProvider = new RegisteredFileSystemProvider(false)
            fileSystemProvider.registerFile(new RegisteredMemoryFile(fileUri, initialHaskellCode))
            registerFileSystemOverlay(1, fileSystemProvider)

            const vscodeApiConfig: MonacoVscodeApiConfig = {
                $type: 'extended',
                extensions: [{
                    config: {
                        name: 'haskell-setup',
                        publisher: 'local',
                        version: '1.0.0',
                        engines: {vscode: '*'},
                        contributes: {
                            languages: [{
                                id: 'haskell',
                                extensions: ['.hs', '.lhs'],
                                aliases: ['Haskell', 'haskell'],
                                configuration: './haskell-language-configuration.json'
                            }],
                            grammars: [{
                                language: 'haskell',
                                scopeName: 'source.haskell',
                                path: './haskell.tmLanguage.json'
                            }]
                        },
                    },
                    filesOrContents: new Map([
                        ['./haskell-language-configuration.json', haskellLanguageConfigRaw],
                        ['./haskell.tmLanguage.json', haskellGrammarRaw],
                    ])
                }],
                viewsConfig: {
                    $type: 'EditorService',
                    htmlContainer: editorRef.current as HTMLElement,
                },
                serviceOverrides: {
                    ...getTextmateServiceOverride(),
                    ...getThemeServiceOverride(),
                    ...getLanguagesServiceOverride(),
                    // Needed so we can call updateUserConfiguration() later at runtime
                    // (e.g. when the app's own theme toggle changes), not just at startup.
                    ...getConfigurationServiceOverride(),
                },
                userConfiguration: {
                    json: buildUserConfigurationJson(theme)
                },
                monacoWorkerFactory: configureDefaultWorkerFactory
            };

            const languageClientConfig: LanguageClientConfig = {
                languageId: languageId,
                connection: {
                    options: {
                        $type: 'WebSocketUrl',
                        url: 'ws://localhost:8080'
                    }
                },
                clientOptions: {
                    documentSelector: [languageId],
                    workspaceFolder: {
                        index: 0,
                        name: 'pbkat-workspace',
                        uri: vscode.Uri.file('/opt/pbkat')
                    },
                },
            };

            const editorAppConfig: EditorAppConfig = {
                codeResources: {
                    modified: {text: initialHaskellCode, uri: fileUri.toString()}
                }
            };

            const apiWrapper = new MonacoVscodeApiWrapper(vscodeApiConfig);
            await apiWrapper.start()

            const lcWrapper = new LanguageClientWrapper(languageClientConfig);

            console.log("Trying to start editor")
            if (editorRef.current) {
                const editorApp = new EditorApp(editorAppConfig);
                await editorApp.start(editorRef.current)
                editorRefInstance.current = editorApp.getEditor();
                restrictToEditableRegion(editorRefInstance.current!);
                await lcWrapper.start()

                console.log("Started everything")
            }
        };

        startEditor().catch(console.error);
    }, []);


    // Keep the editor's color theme in sync with the app's ThemeProvider.
    // Guarded with a mounted flag (separate from `initialized`, which flips
    // true before startup even finishes) so this only runs on *later* theme
    // changes — the initial theme is already applied via userConfiguration
    // above, and calling updateUserConfiguration again here always sends the
    // FULL settings object so nothing else gets dropped.
    const mounted = useRef(false);
    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
            return;
        }
        updateUserConfiguration(buildUserConfigurationJson(theme));
    }, [theme]);

    useEffect(() => {
        const editor = editorRefInstance.current;
        if (!editor) return;

        editor.updateOptions({
            fontSize: settings.fontSize,
            fontFamily: settings.fontFamily,
            lineHeight: settings.lineHeight,
            letterSpacing: settings.letterSpacing,

            wordWrap: settings.wordWrap,
            tabSize: settings.tabSize,

            cursorStyle: settings.cursorStyle,
            cursorBlinking: settings.cursorBlinking,


            smoothScrolling: settings.smoothScrolling,
            automaticLayout: settings.automaticLayout,

            renderLineHighlight: 'all',
            bracketPairColorization: { enabled: true },
        });
    }, [settings]);

    return (
        <div className="min-h-full w-full flex flex-col">
            <CustomizationBar settings={settings} setSettings={setSettings}/>
            <div className="h-1 bg-primary-foreground"></div>
            <div id="monaco-editor-root" ref={editorRef} className="min-h-10/11 w-full flex"/>
        </div>);
});

export default MonacoEditor;