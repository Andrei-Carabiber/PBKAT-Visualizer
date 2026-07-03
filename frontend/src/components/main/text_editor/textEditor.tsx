import { MonacoEditorReactComp } from '@typefox/monaco-editor-react';
import type { MonacoVscodeApiConfig } from 'monaco-languageclient/vscodeApiWrapper';
import type { LanguageClientConfig } from 'monaco-languageclient/lcwrapper';
import type { EditorAppConfig } from 'monaco-languageclient/editorApp';
import * as vscode from 'vscode';

export default function PbkatEditor() {

    const vscodeApiConfig: MonacoVscodeApiConfig = {
        $type: 'classic',
        viewsConfig: { $type: 'EditorService' }
    };


    const languageClientConfig: LanguageClientConfig = {
        languageId: 'haskell',
        connection: {
            options: { $type: 'WebSocketUrl', url: 'ws://localhost:8080' }
        },
        clientOptions: {
            documentSelector: [{ scheme: 'file', language: 'haskell' }],
            workspaceFolder: {
                index: 0,
                name: 'pbkat-workspace',
                uri: vscode.Uri.parse('file:///opt/pbkat')
            }
        }
    };

    const editorAppConfig: EditorAppConfig = {
        useDiffEditor: false,
        codeResources: {
            original: {
                text: `module Pa where\n\nimport ProbBellKATPolicy\n\np :: ProbBellKATPolicy\np = (create "C" <||> create "C") <> (trans "C" ("A", "C"))`,
                uri: 'file:///opt/pbkat/probabilistic-examples/Pa.hs',
                enforceLanguageId: 'haskell'
            }
        },
    };

    return (
        <div style={{ height: "600px", width: "100%", border: "1px solid #333", backgroundColor: "#1e1e1e" }}>
            <MonacoEditorReactComp
                vscodeApiConfig={vscodeApiConfig}
                editorAppConfig={editorAppConfig}
                languageClientConfig={languageClientConfig}
                style={{ height: '100%', width: '100%' }}
                onError={(e) => console.error("Editor Error:", e)}
            />
        </div>
    );
}