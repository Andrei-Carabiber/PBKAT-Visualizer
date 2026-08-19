import {Label} from "@/components/ui/label.tsx";
import FormattedOutput from "@/components/main/result_display/FormattedOutput.tsx";
import FormattedQuantumOutput from "@/components/main/result_display/FormattedQuantumOutput.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {useState} from "react";
import type {LastSettingsRan} from "@/store/runEngine.ts";

const SmallResultDisplay = ({settings}: { settings: LastSettingsRan }) => {
    const [estimatedMode, setEstimatedMode] = useState<boolean>(false);

    const formattedData = settings.result
    return (
        <>
            {formattedData && (
                <div>
                    <div
                        className="flex items-center justify-between pb-2 text-xs uppercase text-muted-foreground">
                        <div className="flex gap-8 w-full items-center">
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
                            </div>
                        </div>
                    </div>

                    {settings && (
                        <>
                            {(formattedData.mode === "probability" || formattedData.mode === 'run') && (
                                <FormattedOutput compare={{displayData: formattedData, networkGoal: settings.goal}} estimatedMode={estimatedMode}/>
                            )}

                            {(formattedData.mode === "probQuality" || formattedData.mode === 'probOnly') && (
                                <FormattedQuantumOutput displayData={formattedData} estimatedMode={estimatedMode}/>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default SmallResultDisplay;