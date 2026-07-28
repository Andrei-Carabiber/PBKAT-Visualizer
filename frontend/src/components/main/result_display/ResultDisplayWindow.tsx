import {useRunEngine} from "@/store/runEngine.ts";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {X} from 'lucide-react';
import FormattedOutput from "@/components/main/result_display/FormattedOutput.tsx";
import FormattedQuantumOutput from "@/components/main/result_display/FormattedQuantumOutput.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {useState} from "react";
import {useCustomization} from "@/store/customization.ts";

const ResultDisplayWindow = () => {
    const {data, error, loading, clearOutput} = useRunEngine();
    const {showStatistics} = useCustomization();
    const [estimatedMode, setEstimatedMode] = useState<boolean>(false);

    return (
        <>
            {(data || error || loading) && (
                <div
                    className="w-full bg-muted border rounded-xl p-4 max-h-fit overflow-y-auto font-mono text-base shadow-sm">
                    <div
                        className="flex items-center justify-between pb-2 mb-2 border-b text-xs uppercase text-muted-foreground">
                        <div className="flex gap-8">
                            <span className="font-bold">Output</span>
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
                        </div>
                        {loading ? (
                            <span className="animate-pulse text-primary">Running...</span>
                        ) : (
                            <Button
                                variant="ghost"
                                onClick={clearOutput}
                                className="hover:text-foreground text-xs underline p-1 h-auto"
                            >
                                <X className="w-4 h-4"/>
                            </Button>
                        )}
                    </div>

                    {error && (
                        <p className="text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                            {error}
                        </p>
                    )}

                    {data && (
                        <>
                            {(data.mode === "probability" || data.mode === 'run') && (
                                <FormattedOutput data={data} estimatedMode={estimatedMode}/>
                            )}

                            {(data.mode === "probQuality" || data.mode === 'probOnly') && (
                                <FormattedQuantumOutput data={data} estimatedMode={estimatedMode}/>
                            )}

                            {showStatistics && (
                                <div className="mt-4 pt-2 border-t text-sm space-y-1">
                                    {data.mode === "probOnly" && (
                                        <div>Total Compute Duration: {(data.duration / 1000).toFixed(3)}s</div>
                                    )}

                                    {data.mode === "run" && (
                                        <div>Total Compute
                                            Duration: {(data.durations.firstDuration / 1000).toFixed(3)}s</div>
                                    )}

                                    {(data.mode === 'probability' || data.mode === "probQuality") && (
                                        <div className="flex gap-8">
                                            <p className="bg-card text-card-foreground p-2 rounded-sm">
                                                First Compute time: {(data.durations.firstDuration / 1000).toFixed(3)}s
                                            </p>
                                            <p className="bg-card text-card-foreground p-2 rounded-sm">
                                                Second Compute
                                                time: {((data.durations.secondDuration ?? 0) / 1000).toFixed(3)}s
                                            </p>
                                            <p className="bg-card text-card-foreground p-2 rounded-sm">
                                                Total Compute
                                                time: {((data.durations.firstDuration + (data.durations.secondDuration ?? 0)) / 1000).toFixed(3)}s
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default ResultDisplayWindow;