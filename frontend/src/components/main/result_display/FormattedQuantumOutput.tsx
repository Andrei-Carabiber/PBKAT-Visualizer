import { useState } from "react";
import ProbabilityGraph from "@/components/main/result_display/ProbabilityGraph.tsx";
import WernerGraph from "@/components/main/result_display/WernerGraph.tsx";
import type {QBKATProbOutput, QBKATProbQualityOutput} from "@/components/main/result_display/DataType.ts";
import {Switch} from "@/components/ui/switch.tsx";
import {Label} from "@/components/ui/label.tsx";

const FormattedQuantumOutput = ({data, estimatedMode}: {
    data: QBKATProbQualityOutput | QBKATProbOutput;
    estimatedMode: boolean
}) => {
    const [syncZoom, setSyncZoom] = useState(true);
    const [zoomLeft, setZoomLeft] = useState<string | number>("dataMin");
    const [zoomRight, setZoomRight] = useState<string | number>("dataMax");

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
        if (data.mode === "probOnly") {
            const cdf_max = data.probabilityMax;
            const cdf_min = data.probabilityMin;

            let areIdentical = true;
            for (let i = 0; i < cdf_min.length; i++) {
                if (cdf_min[i] !== cdf_max[i]){
                    areIdentical = false;
                    break;
                }
            }

            return (
                <div className="w-full h-[400px] flex gap-4">
                    <div className="min-h-0 flex-1">
                        <ProbabilityGraph
                            cdf_max={cdf_max}
                            cdf_min={areIdentical ? null : cdf_min}
                            estimatedMode={estimatedMode}
                            {...sharedZoomProps}
                        />
                    </div>
                </div>
            );
        } else if (data.mode === 'probQuality') {
            const probabilities = data.probability;
            return (
                <div className="w-full h-[700px] flex gap-4">
                    <div className="flex min-h-0 flex-1 flex-col gap-4">
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
                                wernerArray={data.wernerArray}
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