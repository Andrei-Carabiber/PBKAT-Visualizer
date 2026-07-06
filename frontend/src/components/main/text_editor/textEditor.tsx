import {useEffect, useRef, useState} from 'react';
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

import '@codingame/monaco-vscode-theme-defaults-default-extension';
import CustomizationBar from "@/components/main/text_editor/customizationBar.tsx";
import type {editor} from '@codingame/monaco-vscode-editor-api'


import haskellGrammarRaw from './haskell.tmLanguage.json?raw';
import haskellLanguageConfigRaw from './haskell-language-configuration.json?raw';

export type editorSettings = {
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    letterSpacing: number;
    cursorStyle?: editor.IEditorOptions['cursorStyle']
    cursorBlinking?: editor.IEditorOptions['cursorBlinking']
    wordWrap?: editor.IEditorOptions['wordWrap']
    tabSize: number;
    smoothScrolling: boolean;
    minimap: {enabled:boolean};
    automaticLayout: boolean;
}

const MonacoEditor = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorRefInstance = useRef<editor.IStandaloneCodeEditor | undefined>(undefined);
    const initialized = useRef(false);
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
        minimap: { enabled: false },
        automaticLayout: true,
    });

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const startEditor = async () => {
            const languageId = 'haskell';
            const initialHaskellCode = '--Haskell Code';

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
                                // path VS Code will look up in this extension's virtual file map
                                configuration: './haskell-language-configuration.json'
                            }],
                            // This is the piece that was missing: it tells the textmate
                            // service which grammar file to load for the "haskell" language id.
                            grammars: [{
                                language: 'haskell',
                                scopeName: 'source.haskell',
                                path: './haskell.tmLanguage.json'
                            }]
                        },
                    },
                    // Virtual filesystem for this extension: maps the relative paths used
                    // above (configuration / grammars[].path) to actual file contents.
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
                },
                userConfiguration: {
                    json: JSON.stringify({
                        'workbench.colorTheme': 'Default Dark Modern',

                        'editor.wordBasedSuggestions': 'off',
                        'editor.tabSize': 4,
                        'editor.insertSpaces': true,

                        'editor.cursorSmoothCaretAnimation': 'on',
                        'editor.bracketPairColorization.enabled': true,

                        'editor.renderLineHighlight': 'all',
                        'editor.letterSpacing': 0.3
                    })
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
                await lcWrapper.start()


                console.log("Started everything")
            }
        };

        startEditor().catch(console.error);
    }, []);


    //Update settings in editor
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

            minimap: settings.minimap,

            smoothScrolling: settings.smoothScrolling,
            automaticLayout: settings.automaticLayout,

            renderLineHighlight: 'all',
            bracketPairColorization: { enabled: true },
        });
    }, [settings]);

    return (
        <div className="min-h-full w-full flex flex-col border-black border-2">
            <CustomizationBar settings={settings} setSettings={setSettings}/>
            <div className="h-1 bg-primary-foreground"></div>
            <div id="monaco-editor-root" ref={editorRef} className="min-h-10/11 w-full flex border-black border-2"/>
        </div>);
};

export default MonacoEditor;