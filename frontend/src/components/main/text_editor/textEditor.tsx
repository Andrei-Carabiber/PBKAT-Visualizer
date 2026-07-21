import {forwardRef, useEffect, useRef, useState} from 'react';
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
import {LoaderCircle} from "lucide-react";
import NetworkGoalBox from "@/components/main/text_editor/NetworkGoalBox.tsx";

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

        'editor.fontSize': 15,
        'editor.lineHeight': 22,
        'editor.fontFamily': 'JetBrains Mono, Fira Code, monospace',

        'editor.wordBasedSuggestions': 'off',
        'editor.tabSize': 4,
        'editor.insertSpaces': true,
        'editor.cursorSmoothCaretAnimation': 'on',
        'editor.bracketPairColorization.enabled': true,
        'editor.renderLineHighlight': 'all',
        'editor.letterSpacing': 0,
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

function restrictToEditableRegion(
    editorInstance: monacoEditor.IStandaloneCodeEditor
): () => void {
    const model = editorInstance.getModel();

    if (!model) {
        return () => {
        }
    }

    // Decoration ids for the "locked" prelude/suffix regions. These are mutable
    // because they must be recreated whenever the underlying decorations are lost
    // (e.g. a full `model.setValue()` call clears all decorations on the model).
    let preludeDecorationId: string | undefined;
    let suffixDecorationId: string | undefined;

    // (Re)computes the marker positions and (re)creates the prelude/suffix
    // decorations from scratch. Returns false if the markers can't be found
    // (e.g. mid-update, or markers were stripped out).
    function setupDecorations(): boolean {
        const startMatch = model!.findMatches(EDITABLE_START_MARKER, false, false, true, null, false)[0];
        const endMatch = model!.findMatches(EDITABLE_END_MARKER, false, false, true, null, false)[0];
        if (!startMatch || !endMatch) {
            console.warn('Editable region markers not found; skipping lock/hide setup.');
            return false;
        }

        const lastLine = model!.getLineCount();
        const oldIds = [preludeDecorationId, suffixDecorationId].filter((id): id is string => !!id);
        const [newPreludeId, newSuffixId] = model!.deltaDecorations(oldIds, [
            {
                range: new Range(1, 1, startMatch.range.startLineNumber, 1),
                options: {stickiness: monacoEditor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges}
            },
            {
                range: new Range(endMatch.range.startLineNumber, 1, lastLine, model!.getLineMaxColumn(lastLine)),
                options: {stickiness: monacoEditor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges}
            },
        ]);
        preludeDecorationId = newPreludeId;
        suffixDecorationId = newSuffixId;
        return true;
    }

    if (!setupDecorations()) {
        return () => {
        };
    }

    function currentBounds() {
        let preludeRange = preludeDecorationId ? model!.getDecorationRange(preludeDecorationId) : null;
        let suffixRange = suffixDecorationId ? model!.getDecorationRange(suffixDecorationId) : null;

        // A full model.setValue() (used e.g. when programmatically setting code)
        // clears decorations entirely, so the tracked ranges above can come back
        // null. Self-heal by re-deriving fresh decorations from the markers.
        if (!preludeRange || !suffixRange) {
            if (!setupDecorations()) {
                // Markers vanished; fall back to something safe rather than throwing.
                const fallback = new Range(1, 1, 1, 1);
                return {
                    preludeRange: fallback,
                    suffixRange: fallback,
                    editableStartLine: 1,
                    editableEndLine: model!.getLineCount(),
                };
            }
            preludeRange = model!.getDecorationRange(preludeDecorationId!)!;
            suffixRange = model!.getDecorationRange(suffixDecorationId!)!;
        }

        return {
            preludeRange,
            suffixRange,
            editableStartLine: preludeRange.endLineNumber + 1,
            editableEndLine: suffixRange.startLineNumber - 1,
        };
    }

    function applyHiddenAreas() {
        const { preludeRange, suffixRange } = currentBounds();

        const hiddenEditor = editorInstance as HiddenAreasCapableEditor;

        requestAnimationFrame(() => {
            hiddenEditor.setHiddenAreas([]);
            hiddenEditor.setHiddenAreas([
                preludeRange,
                suffixRange,
            ]);
        });
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
    return applyHiddenAreas;
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

const MonacoEditor = forwardRef<any, { panelSize: number }>(({panelSize}, _ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorRefInstance = useRef<monacoEditor.IStandaloneCodeEditor | undefined>(undefined);
    const applyHiddenAreasRef = useRef<(() => void) | null>(null);
    const initialized = useRef(false);
    const {theme} = useTheme();
    const [settings, setSettings] = useState<editorSettings>({
        fontSize: 15,
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
    const registerUserCodeGetter = useRunEngine(state => state.registerUserCodeGetter);
    const registerUserCodeSetter = useRunEngine(state => state.registerUserCodeSetter);


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

            if (editorRef.current) {
                const editorApp = new EditorApp(editorAppConfig);
                await editorApp.start(editorRef.current)
                editorRefInstance.current = editorApp.getEditor();
                applyHiddenAreasRef.current = restrictToEditableRegion(editorRefInstance.current!);
                await lcWrapper.start()

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

            // Fetch the graph data right out of our Zustand hook callback setup
            const graphData = useRunEngine.getState().getGraphCallback?.() ?? {nodes: [], edges: []};

            // Retrieve current network goal state directly from Zustand
            const isGoalDisabled = useRunEngine.getState().networkGoalDisabled;
            const connections = useRunEngine.getState().activeConnections;

            const isNetworkDisabled = useRunEngine.getState().networkCapacityDisabled;
            const capacities = isNetworkDisabled ? [] : useRunEngine.getState().networkCapacityConnections.map(c => c.label);

            // Resolve whether to pass the goal array or undefined/null depending on what buildFullSource expects
            const networkGoal = isGoalDisabled ? [] : connections.map(c => c.label);


            // Pass the nodes, edges, and networkGoal context to build the correct boilerplate configuration blocks
            return buildFullSource(userCode, graphData.nodes, graphData.edges, capacities, networkGoal);
        });

        registerUserCodeGetter(() => {
            const model = editorRefInstance.current?.getModel();
            return model ? extractUserCode(model) : '';
        });

        registerUserCodeSetter((newCode) => {
            const editor = editorRefInstance.current;
            const model = editor?.getModel();
            if (!editor || !model) return;

            const { nodes, edges } =
            useRunEngine.getState().getGraphCallback?.() ?? {
                nodes: [],
                edges: [],
            };

            const isGoalDisabled = useRunEngine.getState().networkGoalDisabled;
            const connections = useRunEngine.getState().activeConnections;
            const networkGoal = isGoalDisabled
                ? []
                : connections.map(c => c.label);

            const isNetworkDisabled = useRunEngine.getState().networkCapacityDisabled;
            const capacities = isNetworkDisabled
                ? []
                : useRunEngine.getState().networkCapacityConnections.map(c => c.label);

            const fullSourceCode = buildFullSource(
                newCode,
                nodes,
                edges,
                capacities,
                networkGoal
            );

            const disposable = model.onDidChangeContent(() => {
                disposable.dispose();

                applyHiddenAreasRef.current?.();
                editor.render(true);
            });

            model.setValue(fullSourceCode);

        });

    }, [isEditorReady, registerEditor, registerUserCodeGetter, registerUserCodeSetter]);


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

        if (!isEditorReady || !editor) return;

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
    }, [settings, isEditorReady]);

    return (
        <div className="h-full w-full flex flex-col gap-3 p-4 pt-2 bg-card rounded-lg">
            <div className="flex flex-1 shrink-0 h-20">
                <CustomizationBar settings={settings}
                                  setSettings={setSettings}
                                  panelSize={panelSize}
                />
            </div>
            <div className="flex-20 min-h-0 w-full flex rounded-lg border overflow-hidden nokey">
                <div id="monaco-editor-root" ref={editorRef} className="flex-1 min-h-0 w-full flex nokey"/>
                {!isEditorReady && (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <p className="font-semibold text-xl">Editor is Loading. Please wait...</p>
                        <LoaderCircle className="animate-spin w-1/6 h-1/6"/>
                    </div>
                )}
            </div>

            <div className="shrink-0 flex-1">
                <NetworkGoalBox/>
            </div>
        </div>);
});

export default MonacoEditor;