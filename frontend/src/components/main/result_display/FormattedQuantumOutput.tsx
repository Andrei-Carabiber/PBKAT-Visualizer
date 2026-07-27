import ProbabilityGraph from "@/components/main/result_display/ProbabilityGraph.tsx";
import WernerGraph from "@/components/main/result_display/WernerGraph.tsx";

type ResultType = {
    extremal: {
        coverage_status: {
            budget: number
            status: string
            target: number
            value: number
        },

        goal_states: any[],

        initial_state: Object,
        series: {
            cdf_max: number[]
            cdf_min: number[]
        },

        states: {
            bell_pairs: any[],
            pc: number,
            rendered: string
        }[],
    },
    mdp_rendered: string,
    transition_count: number


}

const FormattedQuantumOutput = ({data}: { data: string }) => {
    const dataObj: ResultType = JSON.parse(data) as ResultType;

    const {cdf_max, cdf_min} = dataObj.extremal.series

    const isIdentical = cdf_max.every((val, index) => val === cdf_min[index]);

    return (
        <div className="w-full h-[400px] flex flex-col space-y-4">
            <h2 className="text-xl font-bold">Graphs</h2>

            <div className="flex-1 w-full min-h-0">
                <ProbabilityGraph cdf_max={cdf_max} cdf_min={isIdentical ? null : cdf_min}/>
            </div>

            {isIdentical && (
                <WernerGraph/>
            )}
        </div>
    );
};

export default FormattedQuantumOutput;