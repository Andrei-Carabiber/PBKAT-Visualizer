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
import {useRunEngine} from "@/store/runEngine.ts";

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
    getUserCode: () => string;
};

type HiddenAreasCapableEditor = monacoEditor.IStandaloneCodeEditor & {
    setHiddenAreas: (ranges: InstanceType<typeof Range>[]) => void;
};

function themeSettingFor(theme: string): string {
    if (theme === 'light') return 'Default Light Modern';
    if (theme === 'dark') return 'Default Dark Modern';
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'Default Dark Modern' : 'Default Light Modern';
}


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


    function selectionsAreSafe(): boolean {
        const {editableStartLine, editableEndLine} = currentBounds();
        return editorInstance.getSelections()?.every(sel =>
            sel.startLineNumber >= editableStartLine && sel.endLineNumber <= editableEndLine
        ) ?? false;
    }

    applyHiddenAreas();

    model.onDidChangeContent(() => applyHiddenAreas());

    editorInstance.addCommand(KeyMod.CtrlCmd | KeyCode.KeyA, () => {
        editorInstance.setSelection(editableRangeNow());
    });

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

const MonacoEditor = forwardRef<MonacoEditorHandle, { panelSize: number }>(({panelSize}, ref) => {
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

    const [isEditorReady, setIsEditorReady] = useState(false);
    const registerEditor = useRunEngine(state => state.registerEditor);

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
                    initializationOptions: {},
                    middleware: {
                        resolveCompletionItem: async (item, token, next) => {
                            try {
                                return await next(item, token);
                            } catch {
                                return item; // fall back to the unresolved item, no error surfaced
                            }
                        },
                        provideFoldingRanges: async (document, context, token, next) => {
                            try {
                                return await next(document, context, token);
                            } catch {
                                return [];
                            }
                        },
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

                setIsEditorReady(true);
            }
        };

        startEditor().catch(console.error);
    }, []);

    useEffect(() => {
        if (!isEditorReady || !editorRefInstance.current) return;

        registerEditor(() => {
            const model = editorRefInstance.current?.getModel();
            const userCode = model ? extractUserCode(model) : '';
            return buildFullSource(userCode);
        });
    }, [isEditorReady, registerEditor]);


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
            bracketPairColorization: {enabled: true},
        });
    }, [settings]);

    return (
        <div className="h-full w-full flex flex-col p-4 pt-2 bg-card rounded-lg">
            <div className="shrink-0">
                <CustomizationBar settings={settings}
                                  setSettings={setSettings}
                                  panelSize={panelSize}
                />
            </div>
            <div id="monaco-editor-root" ref={editorRef} className="flex-1 min-h-0 w-full flex nokey"/>
        </div>);
});

export default MonacoEditor;