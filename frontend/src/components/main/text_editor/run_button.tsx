import { useRunEngine } from "@/store/runEngine";
import { Button } from "@/components/ui/button.tsx";
import {useTour} from "@reactour/tour";

const RunButton = () => {
    const { loading, handleRun } = useRunEngine();
    const { currentStep, setCurrentStep, isOpen } = useTour();

    return (
        <Button id="run-protocol-button" onClick={async () => {
            await handleRun();
            if (isOpen && currentStep === 6) {
                setCurrentStep(7);
            }
        }} disabled={loading} className="min-w-24 w-24 flex h-full rounded-lg px-2">
            {loading ? "Running…" : "Run"}
        </Button>
    );
};

export default RunButton;