import {Editor, type Monaco} from "@monaco-editor/react";
import {Position, editor} from "monaco-editor"
import {useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";


//TODO Use websocket and connect to a Haskell language server directly in backend for lint/autocomplete
// instead of doing it in the frontend
const TextEditor = () => {
    const [code, setCode] = useState(
        'main :: ProbBellKATPolicy\nmain = ucreate ("A", "B") <||> create "C"'
    );

    const handleEditorWillMount = (monaco: Monaco) => {

        monaco.languages.register({ id: "pbkat-haskell" });

        monaco.languages.setLanguageConfiguration("pbkat-haskell", {
            brackets: [["(", ")"], ["[", "]"]],
            autoClosingPairs: [
                { open: "(", close: ")" },
                { open: '"', close: '"' },
                { open: "[", close: "]" },
            ],
            surroundingPairs: [
                { open: "(", close: ")" },
                { open: '"', close: '"' },
            ],
        });

        monaco.languages.setMonarchTokensProvider("pbkat-haskell", {
            tokenizer: {
                root: [
                    [/\b(create|ucreate|trans|swap|distill|whileN|ite|test)\b/, "keyword"],
                    [/\b(ProbBellKATPolicy|IO|module|where|import)\b/, "type"],
                    [/<\|\|>|<>|<\.>|~~\?|\/~\?/, "operator"],
                    [/"[^"]*"/, "string"],
                    [/--.*/, "comment"],
                ],
            },
        });

        monaco.languages.registerCompletionItemProvider("pbkat-haskell", {
            provideCompletionItems: (model: editor.ITextModel, position: Position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };

                const suggestions = [
                    {
                        label: "create",
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: 'create "${1:Node}"', // Fixed: No parentheses
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: "Generate a Bell pair in the given node.",
                        range,
                    },
                    {
                        label: "trans", // Fixed: PBKAT uses 'trans', not 'transmit'
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: 'trans "${1:Origin}" ("${2:Dest1}", "${3:Dest2}")',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: "Transmit a Bell pair.",
                        range,
                    },
                    {
                        label: "ucreate",
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: 'ucreate ("${1:Node1}", "${2:Node2}")',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: "Generate a Bell pair between two nodes.",
                        range,
                    },
                    {
                        label: "swap",
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: 'swap "${1:AtNode}" ("${2:Node1}", "${3:Node2}")',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: "Perform a swap operation.",
                        range,
                    },
                    {
                        label: "distill",
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: 'distill ("${1:Node1}", "${2:Node2}")',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: "Perform distillation on two nodes.",
                        range,
                    },
                    {
                        label: "whileN",
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'whileN ${1:iterations} (test ("${2:Node1}" ${3:~~?} "${4:Node2}")) $ \n\t${5:operation}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: "Bounded while loop.",
                        range,
                    }
                ];
                return { suggestions };
            },
        });
    };

    return (
        <Card className="w-full h-150 flex flex-col border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b pb-4">
                <CardTitle className="text-lg font-mono text-slate-700">Protocol.hs</CardTitle>
            </CardHeader>
            <CardContent className="p-0 grow">
                <Editor
                    height="100%"
                    language="pbkat-haskell"
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    beforeMount={handleEditorWillMount}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "JetBrains Mono, monospace",
                        wordWrap: "on",
                        padding: { top: 16 },
                    }}
                />
            </CardContent>
        </Card>
    );
};

export default TextEditor;
