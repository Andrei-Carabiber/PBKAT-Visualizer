import { useRunEngine } from "@/store/runEngine";
import { Button } from "@/components/ui/button.tsx";

const RunButton = () => {
    const { loading, handleRun } = useRunEngine();

    return (
        <Button onClick={handleRun} disabled={loading} className="w-fit h-full rounded-lg px-3">
            {loading ? "Running…" : "Run"}
        </Button>
    );
};

export default RunButton;