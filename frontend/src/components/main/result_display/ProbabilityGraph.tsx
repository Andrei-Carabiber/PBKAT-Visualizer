import {Area, AreaChart, XAxis, YAxis, ResponsiveContainer, Tooltip} from "recharts";

type PlotPoint = {
    index: number;
    probability?: number;
    min_probability?: number;
    max_probability?: number;
};

const ProbabilityGraph = ({cdf_max, cdf_min, estimatedMode}: {
    cdf_max: number[],
    cdf_min: number[] | null,
    estimatedMode: boolean
}) => {

    const plot_array: PlotPoint[] = !cdf_min
        ? cdf_max.map((value, index) => {
            return {
                probability: value,
                index: index
            }
        })
        : cdf_max.map((value, index) => {
            return {
                min_probability: cdf_min[index],
                max_probability: value,
                index: index
            }
        });

    return (
        <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={plot_array} margin={{top: 10, right: 30, left: 20, bottom: 0}}>
                    <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                        </linearGradient>
                    </defs>

                    <XAxis
                        dataKey="index"
                        type="number"
                        domain={[0, cdf_max.length - 1]}
                        height={52}
                        label={{position: "insideBottomRight", value: "Time units", offset: 5}}
                    />
                    <YAxis
                        domain={[0, 1]}
                        width={80}
                        label={{position: "left", value: "Probability", angle: -90, offset: -15, dy: -45}}
                    />

                    {!cdf_min ? (
                        <>
                            <Area
                                type="monotone"
                                dataKey="probability"
                                stroke="#8884d8"
                                fillOpacity={1}
                                fill="url(#colorUv)"
                                animationBegin={200}
                                animationDuration={1300}
                            />
                            <Tooltip
                                content={({active, payload}) => {
                                    const point = payload?.[0]?.payload as PlotPoint | undefined;
                                    if (!active || !point || point.probability === null) return null;

                                    return (
                                        <div
                                            className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
                                            <p>Time unit: {point.index}</p>
                                            {estimatedMode ? (
                                                <p>Probability: {point.probability ? Number(((point.probability) * 100).toFixed(3)) : 0} %</p>
                                            ) : (
                                                <p>Probability: {point.probability}</p>
                                            )}

                                        </div>
                                    );
                                }}
                            />
                        </>
                    ) : (
                        <>
                            <Area
                                type="monotone"
                                dataKey="min_probability"
                                stroke="#8884d8"
                                fillOpacity={1}
                                fill="url(#colorUv)"
                                animationBegin={200}
                                animationDuration={1300}
                            />
                            <Area
                                type="monotone"
                                dataKey="max_probability"
                                stroke="#82ca9d"
                                fillOpacity={1}
                                fill="url(#colorPv)"
                            />
                            <Tooltip
                                content={({active, payload}) => {
                                    const point = payload?.[0]?.payload as PlotPoint | undefined;
                                    if (!active || !point || point.probability === null) return null;

                                    return (
                                        <div
                                            className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
                                            <p>Time unit: {point.index}</p>
                                            {estimatedMode ? (
                                                <>
                                                    <p>MaxProbability: {point.max_probability ? Number(((point.max_probability) * 100).toFixed(3)) : 0} %</p>
                                                    <p>MinProbability: {point.min_probability ? Number(((point.min_probability) * 100).toFixed(3)) : 0} %</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p>MaxProbability: {point.max_probability}</p>
                                                    <p>MinProbability: {point.min_probability}</p>
                                                </>
                                            )}

                                        </div>
                                    );
                                }}
                            />
                        </>
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ProbabilityGraph;
