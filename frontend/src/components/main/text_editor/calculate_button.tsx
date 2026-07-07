import {type RefObject, useState} from "react";
import { Button } from "@/components/ui/button.tsx";
import type { MonacoEditorHandle } from "@/components/main/text_editor/textEditor";

type RunResult = {
    output: string;
    stats: string;
};

type Props = {
    editorRef: RefObject<MonacoEditorHandle | null>;
};

const RUN_PROTOCOL_URL = "http://localhost:8080/run-protocol";

async function runProtocol(code: string): Promise<RunResult> {
    const response = await fetch(RUN_PROTOCOL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed with status ${response.status}`);
    }

    return response.json();
}

const RunButton = ({ editorRef }: Props) => {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState<any>(null)

    const handleRun = async () => {
        setError(null);
        setData(null);
        setLoading(true);

        try {
            const code = editorRef.current?.getUserCode() || "";

            const result = await runProtocol(code);

            setData(result.output);
        } catch (e: any) {
            setError(e.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <Button
                //TODO Manage handleRun and how you pass the editor
                onClick={() => {}}
                disabled={loading}
                className="w-fit h-full rounded-lg px-3"
            >
                {loading ? "Running…" : "Run"}
            </Button>

            {error && (
                <p className="text-sm text-destructive whitespace-pre-wrap">
                    {error}
                </p>
            )}

            {data && (
                <pre className="text-sm whitespace-pre-wrap">
                    {data}
                </pre>
            )}
        </div>
    );
};

export default RunButton;