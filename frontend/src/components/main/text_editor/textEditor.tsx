import {
    forwardRef,
    useEffect,
    useRef,
    useState
} from 'react';

import * as vscode from 'vscode';

import {
    EditorApp,
    type EditorAppConfig
} from 'monaco-languageclient/editorApp';

import {
    configureDefaultWorkerFactory
} from 'monaco-languageclient/workerFactory';

import {
    MonacoVscodeApiWrapper,
    type MonacoVscodeApiConfig
} from 'monaco-languageclient/vscodeApiWrapper';

import {
    LanguageClientWrapper,
    type LanguageClientConfig
} from 'monaco-languageclient/lcwrapper';

import {
    RegisteredFileSystemProvider,
    RegisteredMemoryFile,
    registerFileSystemOverlay
} from '@codingame/monaco-vscode-files-service-override';

import getTextmateServiceOverride
    from '@codingame/monaco-vscode-textmate-service-override';

import getThemeServiceOverride
    from '@codingame/monaco-vscode-theme-service-override';

import getLanguagesServiceOverride
    from '@codingame/monaco-vscode-languages-service-override';

import getConfigurationServiceOverride, {
    updateUserConfiguration
} from '@codingame/monaco-vscode-configuration-service-override';

import '@codingame/monaco-vscode-theme-defaults-default-extension';

import {
    editor as monacoEditor,
    KeyCode,
    KeyMod,
    Range
} from '@codingame/monaco-vscode-editor-api';

import {
    ChevronDown,
    ChevronUp,
    LoaderCircle
} from 'lucide-react';

import CustomizationBar
    from '@/components/main/text_editor/customizationBar.tsx';

import NetworkGoalBox
    from '@/components/main/text_editor/NetworkGoalBox.tsx';

import {Button} from '@/components/ui/button.tsx';
import {useTheme} from '@/components/theme-provider';
import {useRunEngine} from '@/store/runEngine.ts';
import {useCustomization} from '@/store/customization.ts';

import haskellGrammarRaw
    from './haskell.tmLanguage.json?raw';

import haskellLanguageConfigRaw
    from './haskell-language-configuration.json?raw';

import {
    buildFullSource,
    DEFAULT_USER_CODE,
    EDITABLE_END_MARKER,
    EDITABLE_START_MARKER
} from './haskellBoilerplate';

export type editorSettings = {
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    letterSpacing: number;
    cursorStyle?:
        monacoEditor.IEditorOptions['cursorStyle'];
    cursorBlinking?:
        monacoEditor.IEditorOptions['cursorBlinking'];
    wordWrap?:
        monacoEditor.IEditorOptions['wordWrap'];
    tabSize: number;
    smoothScrolling: boolean;
    automaticLayout: boolean;
};

type HiddenAreasCapableEditor =
    monacoEditor.IStandaloneCodeEditor & {
    setHiddenAreas: (
        ranges: InstanceType<typeof Range>[]
    ) => void;
};

function themeSettingFor(theme: string): string {
    if (theme === 'light') {
        return 'Default Light Modern';
    }

    if (theme === 'dark') {
        return 'Default Dark Modern';
    }

    const prefersDark = window.matchMedia?.(
        '(prefers-color-scheme: dark)'
    ).matches;

    return prefersDark
        ? 'Default Dark Modern'
        : 'Default Light Modern';
}

function buildUserConfigurationJson(
    theme: string
): string {
    return JSON.stringify({
        'workbench.colorTheme':
            themeSettingFor(theme),

        'editor.fontSize': 15,
        'editor.lineHeight': 22,
        'editor.fontFamily':
            'JetBrains Mono, Fira Code, monospace',

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
    KeyCode.LeftArrow,
    KeyCode.RightArrow,
    KeyCode.UpArrow,
    KeyCode.DownArrow,
    KeyCode.Home,
    KeyCode.End,
    KeyCode.PageUp,
    KeyCode.PageDown,
    KeyCode.Escape,
    KeyCode.Shift,
    KeyCode.Ctrl,
    KeyCode.Alt,
    KeyCode.Meta
]);

function restrictToEditableRegion(
    editorInstance:
    monacoEditor.IStandaloneCodeEditor,
    editableStartLineRef: { current: number }
): () => void {
    const model = editorInstance.getModel();

    if (!model) {
        return () => {};
    }

    let preludeDecorationId: string | undefined;
    let suffixDecorationId: string | undefined;

    function setupDecorations(): boolean {
        const startMatch = model!.findMatches(
            EDITABLE_START_MARKER,
            false,
            false,
            true,
            null,
            false
        )[0];

        const endMatch = model!.findMatches(
            EDITABLE_END_MARKER,
            false,
            false,
            true,
            null,
            false
        )[0];

        if (!startMatch || !endMatch) {
            console.warn(
                'Editable region markers not found; ' +
                'skipping lock/hide setup.'
            );
            return false;
        }

        const lastLine = model!.getLineCount();

        const oldIds = [
            preludeDecorationId,
            suffixDecorationId
        ].filter(
            (id): id is string => Boolean(id)
        );

        const [
            newPreludeId,
            newSuffixId
        ] = model!.deltaDecorations(oldIds, [
            {
                range: new Range(
                    1,
                    1,
                    startMatch.range.startLineNumber,
                    1
                ),
                options: {
                    stickiness:
                    monacoEditor
                        .TrackedRangeStickiness
                        .NeverGrowsWhenTypingAtEdges
                }
            },
            {
                range: new Range(
                    endMatch.range.startLineNumber,
                    1,
                    lastLine,
                    model!.getLineMaxColumn(lastLine)
                ),
                options: {
                    stickiness:
                    monacoEditor
                        .TrackedRangeStickiness
                        .NeverGrowsWhenTypingAtEdges
                }
            }
        ]);

        preludeDecorationId = newPreludeId;
        suffixDecorationId = newSuffixId;

        return true;
    }

    if (!setupDecorations()) {
        return () => {};
    }

    function currentBounds() {
        let preludeRange = preludeDecorationId
            ? model!.getDecorationRange(
                preludeDecorationId
            )
            : null;

        let suffixRange = suffixDecorationId
            ? model!.getDecorationRange(
                suffixDecorationId
            )
            : null;

        if (!preludeRange || !suffixRange) {
            if (!setupDecorations()) {
                const fallback =
                    new Range(1, 1, 1, 1);

                return {
                    preludeRange: fallback,
                    suffixRange: fallback,
                    editableStartLine: 1,
                    editableEndLine:
                        model!.getLineCount()
                };
            }

            preludeRange =
                model!.getDecorationRange(
                    preludeDecorationId!
                )!;

            suffixRange =
                model!.getDecorationRange(
                    suffixDecorationId!
                )!;
        }

        if (!preludeRange || !suffixRange) {
            if (!setupDecorations()) {
                const fallback = new Range(1, 1, 1, 1);
                editableStartLineRef.current = 1;
                return {
                    preludeRange: fallback,
                    suffixRange: fallback,
                    editableStartLine: 1,
                    editableEndLine: model!.getLineCount()
                };
            }
            preludeRange = model!.getDecorationRange(preludeDecorationId!)!;
            suffixRange = model!.getDecorationRange(suffixDecorationId!)!;
        }

        const bounds = {
            preludeRange,
            suffixRange,
            editableStartLine: preludeRange.endLineNumber + 1,
            editableEndLine: suffixRange.startLineNumber - 1
        };

        editableStartLineRef.current = bounds.editableStartLine; // <-- new

        return bounds;
    }

    function applyHiddenAreas(): void {
        const {
            preludeRange,
            suffixRange
        } = currentBounds();

        const hiddenEditor =
            editorInstance as HiddenAreasCapableEditor;

        requestAnimationFrame(() => {
            hiddenEditor.setHiddenAreas([]);

            hiddenEditor.setHiddenAreas([
                preludeRange,
                suffixRange
            ]);
        });
    }

    function editableRangeNow():
        InstanceType<typeof Range> {
        const {
            editableStartLine,
            editableEndLine
        } = currentBounds();

        return new Range(
            editableStartLine,
            1,
            editableEndLine,
            model!.getLineMaxColumn(
                editableEndLine
            )
        );
    }

    function selectionsAreSafe(): boolean {
        const {
            editableStartLine,
            editableEndLine
        } = currentBounds();

        return (
            editorInstance
                .getSelections()
                ?.every(
                    (selection) =>
                        selection.startLineNumber >=
                        editableStartLine &&
                        selection.endLineNumber <=
                        editableEndLine
                ) ??
            false
        );
    }

    applyHiddenAreas();

    editorInstance.addCommand(
        KeyMod.CtrlCmd | KeyCode.KeyA,
        () => {
            editorInstance.setSelection(
                editableRangeNow()
            );
        }
    );

    editorInstance.onKeyDown((event) => {
        if (
            ALWAYS_ALLOWED_KEYCODES.has(
                event.keyCode
            )
        ) {
            return;
        }

        const {
            editableStartLine,
            editableEndLine
        } = currentBounds();

        const selections =
            editorInstance.getSelections() ?? [];

        const cursorAtStartBoundary =
            selections.some(
                (selection) =>
                    selection.isEmpty() &&
                    selection.startLineNumber ===
                    editableStartLine &&
                    selection.startColumn === 1
            );

        const cursorAtEndBoundary =
            selections.some((selection) => {
                const lastColumn =
                    model!.getLineMaxColumn(
                        editableEndLine
                    );

                return (
                    selection.isEmpty() &&
                    selection.endLineNumber ===
                    editableEndLine &&
                    selection.endColumn ===
                    lastColumn
                );
            });

        const wouldEscape =
            !selectionsAreSafe() ||
            (
                cursorAtStartBoundary &&
                event.keyCode ===
                KeyCode.Backspace
            ) ||
            (
                cursorAtEndBoundary &&
                event.keyCode ===
                KeyCode.Delete
            );

        if (wouldEscape) {
            event.preventDefault();
            event.stopPropagation();
        }
    });

    editorInstance.addCommand(
        KeyMod.CtrlCmd | KeyCode.KeyV,
        async () => {
            if (!selectionsAreSafe()) {
                return;
            }

            const text =
                await navigator.clipboard.readText();

            const selections =
                editorInstance.getSelections() ?? [];

            editorInstance.executeEdits(
                'paste-guard',
                selections.map((selection) => ({
                    range: selection,
                    text
                }))
            );
        }
    );

    editorInstance.addCommand(
        KeyMod.CtrlCmd | KeyCode.KeyX,
        async () => {
            if (!selectionsAreSafe()) {
                return;
            }

            const selections =
                editorInstance.getSelections() ?? [];

            const text = selections
                .map((selection) =>
                    model!.getValueInRange(
                        selection
                    )
                )
                .join('\n');

            await navigator.clipboard.writeText(
                text
            );

            editorInstance.executeEdits(
                'cut-guard',
                selections.map((selection) => ({
                    range: selection,
                    text: ''
                }))
            );
        }
    );

    return applyHiddenAreas;
}

function extractUserCode(
    model: monacoEditor.ITextModel
): string {
    const startMatch = model.findMatches(
        EDITABLE_START_MARKER,
        false,
        false,
        true,
        null,
        false
    )[0];

    const endMatch = model.findMatches(
        EDITABLE_END_MARKER,
        false,
        false,
        true,
        null,
        false
    )[0];

    if (!startMatch || !endMatch) {
        return model.getValue();
    }

    const from =
        startMatch.range.startLineNumber + 1;

    const to =
        endMatch.range.startLineNumber - 1;

    if (to < from) {
        return '';
    }

    return model.getValueInRange(
        new Range(
            from,
            1,
            to,
            model.getLineMaxColumn(to)
        )
    );
}

const MonacoEditor = forwardRef<
    any,
    {panelSize: number}
>(({panelSize}, _ref) => {
    const editorRef =
        useRef<HTMLDivElement>(null);

    const editorRefInstance = useRef<
        monacoEditor.IStandaloneCodeEditor | undefined
    >(undefined);

    const applyHiddenAreasRef =
        useRef<(() => void) | null>(null);

    const editableStartLineRef = useRef(1);

    const initialized = useRef(false);

    const {theme} = useTheme();

    const {
        editorVisualSettings
    } = useCustomization();

    const [
        isEditorReady,
        setIsEditorReady
    ] = useState(false);

    const registerEditor = useRunEngine(
        (state) => state.registerEditor
    );

    const registerUserCodeGetter = useRunEngine(
        (state) => state.registerUserCodeGetter
    );

    const registerUserCodeSetter = useRunEngine(
        (state) => state.registerUserCodeSetter
    );

    const [
        showGoalBox,
        setShowGoalBox
    ] = useState(true);

    useEffect(() => {
        if (initialized.current) {
            return;
        }

        initialized.current = true;

        const startEditor = async (): Promise<void> => {
            const languageId = 'haskell';

            const initialHaskellCode =
                buildFullSource(
                    DEFAULT_USER_CODE,
                    [],
                    [],
                    [],
                    [],
                    true
                );

            const fileUri = vscode.Uri.file(
                '/opt/pbkat/playground-example/Playground.hs'
            );

            const fileSystemProvider =
                new RegisteredFileSystemProvider(
                    false
                );

            fileSystemProvider.registerFile(
                new RegisteredMemoryFile(
                    fileUri,
                    initialHaskellCode
                )
            );

            registerFileSystemOverlay(
                1,
                fileSystemProvider
            );

            const vscodeApiConfig:
                MonacoVscodeApiConfig = {
                $type: 'extended',
                extensions: [
                    {
                        config: {
                            name: 'haskell-setup',
                            publisher: 'local',
                            version: '1.0.0',
                            engines: {
                                vscode: '*'
                            },
                            contributes: {
                                languages: [
                                    {
                                        id: 'haskell',
                                        extensions: [
                                            '.hs',
                                            '.lhs'
                                        ],
                                        aliases: [
                                            'Haskell',
                                            'haskell'
                                        ],
                                        configuration:
                                            './haskell-language-configuration.json'
                                    }
                                ],
                                grammars: [
                                    {
                                        language:
                                            'haskell',
                                        scopeName:
                                            'source.haskell',
                                        path:
                                            './haskell.tmLanguage.json'
                                    }
                                ]
                            }
                        },
                        filesOrContents: new Map([
                            [
                                './haskell-language-configuration.json',
                                haskellLanguageConfigRaw
                            ],
                            [
                                './haskell.tmLanguage.json',
                                haskellGrammarRaw
                            ]
                        ])
                    }
                ],
                viewsConfig: {
                    $type: 'EditorService',
                    htmlContainer:
                        editorRef.current as HTMLElement
                },
                serviceOverrides: {
                    ...getTextmateServiceOverride(),
                    ...getThemeServiceOverride(),
                    ...getLanguagesServiceOverride(),
                    ...getConfigurationServiceOverride()
                },
                userConfiguration: {
                    json:
                        buildUserConfigurationJson(
                            theme
                        )
                },
                monacoWorkerFactory:
                configureDefaultWorkerFactory
            };

            const webSocketUrl = new URL(
                '/api/',
                window.location.origin
            );

            webSocketUrl.protocol =
                window.location.protocol ===
                'https:'
                    ? 'wss:'
                    : 'ws:';

            const languageClientConfig:
                LanguageClientConfig = {
                languageId,
                connection: {
                    options: {
                        $type: 'WebSocketUrl',
                        url: webSocketUrl.toString()
                    }
                },
                clientOptions: {
                    documentSelector: [
                        languageId
                    ],
                    workspaceFolder: {
                        index: 0,
                        name: 'pbkat-workspace',
                        uri: vscode.Uri.file(
                            '/opt/pbkat'
                        )
                    },
                    initializationOptions: {},
                    middleware: {
                        resolveCompletionItem: async (
                            item,
                            token,
                            next
                        ) => {
                            try {
                                return await next(
                                    item,
                                    token
                                );
                            } catch {
                                return item;
                            }
                        },
                        provideFoldingRanges: async (
                            document,
                            context,
                            token,
                            next
                        ) => {
                            try {
                                return await next(
                                    document,
                                    context,
                                    token
                                );
                            } catch {
                                return [];
                            }
                        }
                    }
                }
            };

            const editorAppConfig:
                EditorAppConfig = {
                codeResources: {
                    modified: {
                        text: initialHaskellCode,
                        uri: fileUri.toString()
                    }
                }
            };

            const apiWrapper =
                new MonacoVscodeApiWrapper(
                    vscodeApiConfig
                );

            await apiWrapper.start();

            if (!editorRef.current) {
                throw new Error(
                    'Monaco editor container is unavailable'
                );
            }

            /*
             * Create and open the Monaco/VS Code document before starting the
             * language client. This guarantees that the initial didOpen is
             * available immediately after LSP initialization.
             */
            const editorApp =
                new EditorApp(editorAppConfig);

            await editorApp.start(
                editorRef.current
            );

            editorRefInstance.current =
                editorApp.getEditor();

            if (!editorRefInstance.current) {
                throw new Error(
                    'Monaco editor instance was not created'
                );
            }

            applyHiddenAreasRef.current =
                restrictToEditableRegion(
                    editorRefInstance.current,
                    editableStartLineRef
                );
            setIsEditorReady(true);
            const lcWrapper =
                new LanguageClientWrapper(
                    languageClientConfig
                );

            try {
                await lcWrapper.start();
            } catch (error) {
                console.error(
                    'Could not start the Haskell language client:',
                    error
                );
            }
        };

        startEditor().catch((error) => {
            console.error(
                'Could not initialize Monaco/HLS:',
                error
            );
        });
    }, []);

    useEffect(() => {
        if (
            !isEditorReady ||
            !editorRefInstance.current
        ) {
            return;
        }

        registerEditor(() => {
            const model =
                editorRefInstance.current
                    ?.getModel();

            const userCode = model
                ? extractUserCode(model)
                : '';

            const graphData =
                useRunEngine
                    .getState()
                    .getGraphCallback?.() ?? {
                    nodes: [],
                    edges: []
                };

            const isGoalDisabled =
                useRunEngine
                    .getState()
                    .networkGoalDisabled;

            const connections =
                useRunEngine
                    .getState()
                    .goalConnections;

            const isNetworkDisabled =
                useRunEngine
                    .getState()
                    .networkCapacityDisabled;

            const capacities =
                isNetworkDisabled
                    ? []
                    : useRunEngine
                        .getState()
                        .networkCapacityConnections
                        .map(
                            (connection) =>
                                connection.label
                        );

            const networkGoal =
                isGoalDisabled
                    ? []
                    : connections.map(
                        (connection) =>
                            connection.label
                    );

            return buildFullSource(
                userCode,
                graphData.nodes,
                graphData.edges,
                capacities,
                networkGoal
            );
        });

        registerUserCodeGetter(() => {
            const model =
                editorRefInstance.current
                    ?.getModel();

            return model
                ? extractUserCode(model)
                : '';
        });

        registerUserCodeSetter((newCode) => {
            const editor =
                editorRefInstance.current;

            const model =
                editor?.getModel();

            if (!editor || !model) {
                return;
            }

            const {
                nodes,
                edges
            } =
            useRunEngine
                .getState()
                .getGraphCallback?.() ?? {
                nodes: [],
                edges: []
            };

            const isGoalDisabled =
                useRunEngine
                    .getState()
                    .networkGoalDisabled;

            const connections =
                useRunEngine
                    .getState()
                    .goalConnections;

            const networkGoal =
                isGoalDisabled
                    ? []
                    : connections.map(
                        (connection) =>
                            connection.label
                    );

            const isNetworkDisabled =
                useRunEngine
                    .getState()
                    .networkCapacityDisabled;

            const capacities =
                isNetworkDisabled
                    ? []
                    : useRunEngine
                        .getState()
                        .networkCapacityConnections
                        .map(
                            (connection) =>
                                connection.label
                        );

            const fullSourceCode =
                buildFullSource(
                    newCode,
                    nodes,
                    edges,
                    capacities,
                    networkGoal
                );

            const disposable =
                model.onDidChangeContent(() => {
                    disposable.dispose();

                    applyHiddenAreasRef
                        .current?.();

                    editor.render(true);
                });

            model.setValue(fullSourceCode);
        });
    }, [
        isEditorReady,
        registerEditor,
        registerUserCodeGetter,
        registerUserCodeSetter
    ]);

    const mounted = useRef(false);

    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
            return;
        }

        updateUserConfiguration(
            buildUserConfigurationJson(theme)
        );
    }, [theme]);

    useEffect(() => {
        const editor =
            editorRefInstance.current;

        if (!isEditorReady || !editor) {
            return;
        }

        editor.updateOptions({
            lineNumbers: (originalLineNumber: number) => {
                const offset = editableStartLineRef.current - 1;
                const displayLine = originalLineNumber - offset;
                return displayLine > 0 ? String(displayLine) : '';
            },
            fontSize:
            editorVisualSettings.fontSize,
            fontFamily: '',
            lineHeight:
            editorVisualSettings.lineHeight,
            letterSpacing:
            editorVisualSettings.letterSpacing,

            wordWrap:
            editorVisualSettings.wordWrap,
            tabSize: 4,

            cursorStyle: 'line',
            cursorBlinking: 'blink',

            smoothScrolling: true,
            automaticLayout: true,

            renderLineHighlight: 'all',
            bracketPairColorization: {
                enabled: true
            }
        });
    }, [
        editorVisualSettings,
        isEditorReady
    ]);

    return (
        <div
            className={
                'h-full w-full flex flex-col gap-3 ' +
                'p-4 pb-0 pt-3 bg-card rounded-lg ' +
                'overflow-hidden'
            }
        >
            <div className="flex shrink-0 h-20">
                <CustomizationBar
                    panelSize={panelSize}
                />
            </div>

            <div
                id="monaco-editor-container"
                className={
                    'flex-1 min-h-0 w-full flex ' +
                    'rounded-lg border overflow-hidden nokey'
                }
            >
                <div
                    id="monaco-editor-root"
                    ref={editorRef}
                    className={
                        'flex-1 min-h-0 w-full flex nokey'
                    }
                />

                {!isEditorReady && (
                    <div
                        className={
                            'w-full h-full flex flex-col ' +
                            'items-center justify-center'
                        }
                    >
                        <p className="font-semibold text-xl">
                            Editor is loading. Please wait...
                        </p>

                        <LoaderCircle
                            data-testid={"loading-editor-spinner"}
                            className={
                                'animate-spin w-1/6 h-1/6'
                            }
                        />
                    </div>
                )}
            </div>

            <div
                className={
                    'relative shrink-0 flex flex-col ' +
                    'items-center pt-2'
                }
            >
                <Button
                    onClick={() =>
                        setShowGoalBox(
                            (previous) => !previous
                        )
                    }
                    className={
                        'absolute -top-1 z-10 flex h-4 w-12 ' +
                        'items-center justify-center rounded-b-none ' +
                        'rounded-t-lg border border-b-0 ' +
                        'bg-accent/50 text-muted-foreground ' +
                        'transition-colors hover:bg-accent/80 ' +
                        'hover:text-accent-foreground focus:outline-none'
                    }
                    title={
                        showGoalBox
                            ? 'Hide Network Goal'
                            : 'Show Network Goal'
                    }
                >
                    {showGoalBox ? (
                        <ChevronDown
                            className="h-3 w-4"
                        />
                    ) : (
                        <ChevronUp
                            className="h-3 w-4"
                        />
                    )}
                </Button>

                {showGoalBox && (
                    <div
                        id="network-goal-box"
                        className="w-full shrink-0 pb-4"
                    >
                        <NetworkGoalBox />
                    </div>
                )}
            </div>
        </div>
    );
});

MonacoEditor.displayName = 'MonacoEditor';

export default MonacoEditor;