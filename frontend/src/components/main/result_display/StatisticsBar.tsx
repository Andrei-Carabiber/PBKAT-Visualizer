import {useRunEngine} from "@/store/runEngine.ts";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {BadgeInfo} from "lucide-react";
import {useMemo} from "react";
import {getMeanWaitingTime, getMeanWerner, secretKeyRate} from "@/components/main/result_display/utils.ts";
import SaveResultsButton from "@/components/main/result_display/SaveResultsButtons.tsx";

const StatisticsBar = ({estimatedMode} : {estimatedMode:boolean}) => {
    const {data} = useRunEngine();

    const stats = useMemo(() => {
        if (!data) return null;

        let pmf: number[] | null = null;

        if (data.mode === "probQuality") {
            const prob = data.probability;
            if (prob && prob.length > 0) {
                pmf = [prob[0]];
                for (let i = 1; i < prob.length; i++) {
                    pmf.push(prob[i] - prob[i - 1]);
                }
            }
        }

        if (!pmf) return null;

        const meanWaitingTime = getMeanWaitingTime(pmf);
        let secretKey: number | null = null;
        let meanWerner: number | null = null;

        if (data.mode === "probQuality") {
            secretKey = secretKeyRate(pmf, data.wernerArray);
            meanWerner = getMeanWerner(pmf, data.wernerArray);
        }

        return {
            meanWaitingTime,
            secretKey,
            meanWerner
        };
    }, [data]);

    if (!data) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-4 mt-4 pt-2 border-t text-sm space-y-1 items-center 2xl:text-base">
            {data.mode === "probOnly" && (
                <div>Total Compute Duration: {(data.duration / 1000).toFixed(estimatedMode ? 2 : 6)}s</div>
            )}

            {data.mode === "run" && (
                <div>Total Compute Duration: {(data.durations.firstDuration / 1000).toFixed(estimatedMode ? 2 : 6)}s</div>
            )}

            {(data.mode === 'probability' || data.mode === "probQuality") && (
                <div className="flex gap-8">
                    <p className="bg-card text-card-foreground p-2 rounded-sm">
                        {data.mode === "probability" ? "Time to compute static probabilities" : "Time to compute mixed state probabilities"}
                        : {(data.durations.firstDuration / 1000).toFixed(estimatedMode ? 2 : 6)}s
                    </p>
                    <p className="bg-card text-card-foreground p-2 rounded-sm">
                        {data.mode === 'probability' ? "Time to compute probability of Network Goal" : "Time to compute pure state probabilities"}
                        : {((data.durations.secondDuration ?? 0) / 1000).toFixed(estimatedMode ? 2 : 6)}s
                    </p>
                    <p className="bg-card text-card-foreground p-2 rounded-sm">
                        Total Compute time: {((data.durations.firstDuration + (data.durations.secondDuration ?? 0)) / 1000).toFixed(estimatedMode ? 2 : 6)}s
                    </p>
                </div>
            )}

            {stats?.meanWaitingTime !== null && stats?.meanWaitingTime !== undefined && (
                <div className="bg-card text-card-foreground p-2 rounded-sm">
                    Mean Waiting Time: {stats.meanWaitingTime.toFixed(estimatedMode ? 2 : 6)}
                </div>
            )}

            {stats?.secretKey !== null && stats?.meanWerner !== null && stats?.secretKey !== undefined && stats?.meanWerner !== undefined && (
                <>
                    <div className="bg-card text-card-foreground p-2 rounded-sm">
                        Secret Key Rate: {stats.secretKey.toFixed(estimatedMode ? 2 : 6)}
                    </div>
                    <div className="bg-card text-card-foreground p-2 rounded-sm">
                        Mean Werner: {stats.meanWerner.toFixed(estimatedMode ? 2 : 6)}
                    </div>
                </>
            )}

            {data._cached && (
                <Tooltip>
                    <TooltipTrigger>
                        <BadgeInfo/>
                    </TooltipTrigger>
                    <TooltipContent>
                        The computation was cached in the server. The time you see was the time
                        it took to calculate the cached result.
                    </TooltipContent>
                </Tooltip>
            )}

            <SaveResultsButton />
        </div>
    );
};

export default StatisticsBar;