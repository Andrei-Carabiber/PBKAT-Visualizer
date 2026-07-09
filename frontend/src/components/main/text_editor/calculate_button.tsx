import { useRunEngine } from "@/store/runEngine";
import { Button } from "@/components/ui/button.tsx";

const RunButton = () => {
    const { loading, handleRun } = useRunEngine();

    return (
        <Button onClick={handleRun} disabled={loading} className="min-w-24 w-24 flex h-full rounded-lg px-2">
            {loading ? "Running…" : "Run"}
        </Button>
    );
};

export default RunButton;