import { useState } from "react";
import ProbabilityGraph from "@/components/main/result_display/ProbabilityGraph.tsx";
import WernerGraph from "@/components/main/result_display/WernerGraph.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {Label} from "@/components/ui/label.tsx";
import {useRunEngine} from "@/store/runEngine.ts";

const FormattedQuantumOutput = ({estimatedMode}: {
    estimatedMode: boolean
}) => {
    const [syncZoom, setSyncZoom] = useState(true);
    const [zoomLeft, setZoomLeft] = useState<string | number>("dataMin");
    const [zoomRight, setZoomRight] = useState<string | number>("dataMax");

    const {formattedData} = useRunEngine();

    if (!formattedData) return;

    const handleZoomChange = (left: string | number, right: string | number) => {
        setZoomLeft(left);
        setZoomRight(right);
    };

    const handleResetZoom = () => {
        setZoomLeft("dataMin");
        setZoomRight("dataMax");
    };

    const sharedZoomProps = syncZoom ? {
        zoomLeft,
        zoomRight,
        onZoomChange: handleZoomChange,
        onResetZoom: handleResetZoom
    } : {};

    const graphs = () => {
        if (formattedData.mode === "probOnly") {
            const cdf_max = formattedData.probabilityMax;
            const cdf_min = formattedData.probabilityMin;

            let areIdentical = true;
            for (let i = 0; i < cdf_min.length; i++) {
                if (cdf_min[i] !== cdf_max[i]){
                    areIdentical = false;
                    break;
                }
            }

            return (
                <div className="w-full h-100 flex gap-4">
                    <div id="quantum-probability-output" className="min-h-0 flex-1">
                        <ProbabilityGraph
                            cdf_max={cdf_max}
                            cdf_min={areIdentical ? null : cdf_min}
                            estimatedMode={estimatedMode}
                            {...sharedZoomProps}
                        />
                    </div>
                </div>
            );
        } else if (formattedData.mode === 'probQuality') {
            const probabilities = formattedData.probability;
            return (
                <div className="w-full h-175 flex gap-4">
                    <div id="quantum-output" className="flex min-h-0 flex-1 flex-col gap-4">
                        <div className="min-h-0 flex-1">
                            <ProbabilityGraph
                                cdf_max={probabilities}
                                cdf_min={null}
                                estimatedMode={estimatedMode}
                                {...sharedZoomProps}
                            />
                        </div>

                        <div className="min-h-0 flex-1">
                            <WernerGraph
                                wernerArray={formattedData.wernerArray}
                                estimatedMode={estimatedMode}
                                {...sharedZoomProps}
                            />
                        </div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center space-x-2">
                <Switch
                    id="sync-zoom-mode"
                    checked={syncZoom}
                    onCheckedChange={(checked) => setSyncZoom(checked)}
                />
                <Label htmlFor="sync-zoom-mode">
                    Sync Zoom for Graphs
                </Label>
            </div>
            {graphs()}
        </div>
    );
};

export default FormattedQuantumOutput;