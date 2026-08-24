import {useEffect, useState} from "react";
import {useReactFlow} from "@xyflow/react";
import {RefreshCw, Square, X} from "lucide-react";

import {useRunEngine} from "@/store/runEngine.ts";
import {useCustomization} from "@/store/customization.ts";

import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Switch} from "@/components/ui/switch.tsx";

import FormattedOutput from "@/components/main/result_display/FormattedOutput.tsx";
import FormattedQuantumOutput from "@/components/main/result_display/FormattedQuantumOutput.tsx";
import StatisticsBar from "@/components/main/result_display/StatisticsBar.tsx";
import SaveResultsButton from "@/components/main/result_display/SaveResultsButtons.tsx";
import SaveToHistoryButton from "@/components/main/result_display/SaveToHistoryButton.tsx";
import RunStatusBadge from "@/components/main/result_display/RunStatusBadge.tsx";

const ResultDisplayWindow = () => {
    const {
        formattedData,
        error,
        loading,
        activeJob,
        cancelActiveJob,
        retryActiveJob,
        resumeSavedJob,
        clearOutput,
    } = useRunEngine();

    const {showStatistics} = useCustomization();
    const [estimatedMode, setEstimatedMode] = useState(false);
    const {fitView} = useReactFlow();

    useEffect(() => {
        void resumeSavedJob();
    }, [resumeSavedJob]);

    const canCancel =
        activeJob?.status === "queued" ||
        activeJob?.status === "running";

    const canRetry =
        activeJob?.status === "failed" ||
        activeJob?.status === "interrupted" ||
        activeJob?.status === "timed_out";

    const progressText = (() => {
        if (!activeJob) return null;

        if (activeJob.status === "queued") {
            if (activeJob.queuePosition != null) {
                return `Waiting in queue, position ${activeJob.queuePosition}`;
            }

            return "Waiting for an available worker";
        }

        if (activeJob.status !== "running") {
            return null;
        }

        switch (activeJob.stage) {
            case "building-model":
                return "Building model…";
            case "calculating":
                return "Calculating…";
            case "calculating-quality":
                return "Calculating quality…";
            default:
                return "Starting calculation…";
        }
    })();

    const showWindow =
        Boolean(error) ||
        loading ||
        Boolean(formattedData) ||
        Boolean(activeJob);

    if (!showWindow) {
        return null;
    }

    return (
        <div
            id="result-display-window"
            className="w-full max-h-fit overflow-y-auto rounded-xl border bg-muted p-4 font-mono text-base shadow-sm"
        >
            {/* Header */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="text-xs font-bold uppercase text-muted-foreground">
                        Output
                    </span>

                    {activeJob && (
                        <RunStatusBadge
                            status={activeJob.status}
                            queuePosition={activeJob.queuePosition}
                        />
                    )}

                    {activeJob && activeJob.attempt > 1 && (
                        <span className="text-[11px] text-muted-foreground">
                            Attempt {activeJob.attempt}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {formattedData && (
                        <>
                            <div className="mr-2 flex items-center gap-2">
                                <Label
                                    htmlFor="estimated-mode"
                                    className="text-xs font-semibold"
                                >
                                    Estimated Mode
                                </Label>

                                <Switch
                                    id="estimated-mode"
                                    checked={estimatedMode}
                                    onCheckedChange={setEstimatedMode}
                                />
                            </div>

                            <SaveToHistoryButton />
                            <SaveResultsButton />
                        </>
                    )}

                    {canCancel && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void cancelActiveJob()}
                        >
                            <Square className="mr-1.5 h-3 w-3" />
                            Cancel
                        </Button>
                    )}

                    {canRetry && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void retryActiveJob()}
                        >
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                            Retry
                        </Button>
                    )}

                    {!loading && (
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Close output"
                            onClick={() => {
                                clearOutput();
                                setTimeout(() => fitView(), 50);
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Queued/running progress */}
            {progressText && (
                <div className="mb-3 overflow-hidden rounded-lg border bg-background/60">
                    <div className="flex items-center gap-3 px-3 py-2.5">
                        <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-primary" />

                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground">
                                {progressText}
                            </p>

                            {activeJob?.status === "queued" ? (
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    The calculation will start automatically.
                                </p>
                            ) : (
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    The server is processing your protocol.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Indeterminate progress bar */}
                    <div className="h-1 overflow-hidden bg-primary/10">
                        <div className="h-full w-1/3 animate-[queue-progress_1.5s_ease-in-out_infinite] bg-primary" />
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                    <p className="text-sm font-medium text-destructive">
                        {error}
                    </p>

                    {activeJob?.error &&
                        activeJob.error !== error && (
                            <p className="mt-1 text-xs text-destructive/80">
                                {activeJob.error}
                            </p>
                        )}
                </div>
            )}

            {/* Cancelled message */}
            {activeJob?.status === "cancelled" && !formattedData && (
                <div className="rounded-lg border bg-background/60 p-4 text-center">
                    <p className="text-sm font-medium">
                        Calculation cancelled
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        The run remains available in Runs & Saved.
                    </p>
                </div>
            )}

            {/* Completed result */}
            {formattedData && (
                <>
                    {(formattedData.mode === "probability" ||
                        formattedData.mode === "run") && (
                        <FormattedOutput estimatedMode={estimatedMode} />
                    )}

                    {(formattedData.mode === "probQuality" ||
                        formattedData.mode === "probOnly") && (
                        <FormattedQuantumOutput
                            estimatedMode={estimatedMode}
                        />
                    )}

                    {showStatistics && (
                        <StatisticsBar estimatedMode={estimatedMode} />
                    )}
                </>
            )}
        </div>
    );
};

export default ResultDisplayWindow;