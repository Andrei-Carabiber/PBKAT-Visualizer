import ProbabilityGraph from "@/components/main/result_display/ProbabilityGraph.tsx";
import WernerGraph from "@/components/main/result_display/WernerGraph.tsx";
import type {QBKATProbOutput, QBKATProbQualityOutput} from "@/components/main/result_display/DataType.ts";

const FormattedQuantumOutput = ({data, estimatedMode}: {
    data: QBKATProbQualityOutput | QBKATProbOutput;
    estimatedMode: boolean
}) => {

    const graphs = () => {
        if (data.mode === "probOnly") {
            const cdf_max = data.probabilityMax
            const cdf_min = data.probabilityMin

            let areIdentical = true;
            for (let i = 0; i < cdf_min.length; i++) {
                if (cdf_min[i] !== cdf_max[i]){
                    areIdentical = false;
                    break
                }
            }

            return (
                <div className="w-full h-[400px] flex gap-4">
                    <div className="min-h-0 flex-1">
                        <ProbabilityGraph cdf_max={cdf_max} cdf_min={areIdentical ? null : cdf_min} estimatedMode={estimatedMode}/>
                    </div>
                </div>
            )
        } else if (data.mode === 'probQuality') {
            const probabilities = data.probability;
            return (
                <div className="w-full h-[700px] flex gap-4">
                    <div className="flex min-h-0 flex-1 flex-col gap-4">
                        <div className="min-h-0 flex-1">
                            <ProbabilityGraph cdf_max={probabilities} cdf_min={null} estimatedMode={estimatedMode}/>
                        </div>

                        <div className="min-h-0 flex-1">
                            <WernerGraph wernerArray={data.wernerArray} estimatedMode={estimatedMode}/>
                        </div>
                    </div>
                </div>
            );
        }
    }


    return (
        <div>
            {graphs()}
        </div>
    );
};

export default FormattedQuantumOutput;
