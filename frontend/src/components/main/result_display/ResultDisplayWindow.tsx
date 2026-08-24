import {useRunEngine} from "@/store/runEngine.ts";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {RefreshCw, Square, X} from 'lucide-react';
import FormattedOutput from "@/components/main/result_display/FormattedOutput.tsx";
import FormattedQuantumOutput from "@/components/main/result_display/FormattedQuantumOutput.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {useEffect, useState} from "react";
import {useCustomization} from "@/store/customization.ts";
import StatisticsBar from "@/components/main/result_display/StatisticsBar.tsx";
import SaveResultsButton from "@/components/main/result_display/SaveResultsButtons.tsx";
import {useReactFlow} from "@xyflow/react";
import SaveToHistoryButton from "@/components/main/result_display/SaveToHistoryButton.tsx";

const ResultDisplayWindow = () => {
    const {formattedData, error, loading, activeJob, cancelActiveJob, retryActiveJob, resumeSavedJob, clearOutput} = useRunEngine();
    const {showStatistics} = useCustomization();
    const [estimatedMode, setEstimatedMode] = useState<boolean>(false);
    const {fitView} = useReactFlow()

    useEffect(() => {
        void resumeSavedJob();
    }, [resumeSavedJob]);

    const statusText = activeJob?.status === "queued"
        ? `Queued${activeJob.queuePosition ? ` (#${activeJob.queuePosition})` : ""}`
        : activeJob?.stage === "building-model"
            ? "Building model…"
            : activeJob?.stage === "calculating-quality"
                ? "Calculating quality…"
                : "Calculating…";
    const canRetry = activeJob?.status === "failed" || activeJob?.status === "interrupted" || activeJob?.status === "timed_out";


    return (
        <>
            {(error || loading || formattedData || activeJob) && (
                <div
                    id="result-display-window"
                    className="w-full bg-muted border rounded-xl p-4 max-h-fit overflow-y-auto font-mono text-base shadow-sm">
                    <div
                        className="flex items-center justify-between pb-2 mb-2 border-b text-xs uppercase text-muted-foreground">
                        <div className="flex gap-8 w-full items-center">
                            <span className="font-bold">Output</span>
                            <div className="flex justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="estimated-mode" className="font-semibold">
                                        Estimated Mode
                                    </Label>
                                    <Switch
                                        id="estimated-mode"
                                        checked={estimatedMode}
                                        onCheckedChange={setEstimatedMode}
                                    />
                                </div>
                                {formattedData && (
                                    <div className="flex items-center gap-2 h-full">
                                        <SaveToHistoryButton />
                                        <SaveResultsButton/>
                                    </div>
                                )}
                            </div>
                        </div>
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <span className="animate-pulse text-primary">{statusText}</span>
                                <Button variant="outline" size="sm" onClick={() => void cancelActiveJob()}>
                                    <Square className="w-3 h-3 mr-1"/> Cancel
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                {canRetry && (
                                    <Button variant="outline" size="sm" onClick={() => void retryActiveJob()}>
                                        <RefreshCw className="w-3 h-3 mr-1"/> Retry
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        clearOutput();
                                        setTimeout(() => fitView(), 50)
                                    }}
                                    className="hover:text-foreground text-xs underline p-1 h-auto"
                                >
                                    <X className="w-4 h-4"/>
                                </Button>
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                            {error}
                        </p>
                    )}

                    {formattedData && (
                        <>
                            {(formattedData.mode === "probability" || formattedData.mode === 'run') && (
                                <FormattedOutput estimatedMode={estimatedMode}/>
                            )}

                            {(formattedData.mode === "probQuality" || formattedData.mode === 'probOnly') && (
                                <FormattedQuantumOutput estimatedMode={estimatedMode}/>
                            )}

                            {showStatistics && (
                                <StatisticsBar estimatedMode={estimatedMode}/>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default ResultDisplayWindow;
