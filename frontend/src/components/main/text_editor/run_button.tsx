import { useRunEngine } from "@/store/runEngine";
import { Button } from "@/components/ui/button.tsx";

const RunButton = () => {
    const { loading, activeJob, handleRun } = useRunEngine();

    const label = loading
        ? activeJob?.status === "queued" ? "Queued…" : "Running…"
        : "Run";

    return (
        <Button id="run-protocol-button" onClick={handleRun} disabled={loading} className="min-w-24 w-24 flex h-full rounded-lg px-2">
            {label}
        </Button>
    );
};

export default RunButton;
