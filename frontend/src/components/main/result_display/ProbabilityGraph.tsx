import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

type PlotPoint = {
    index: number;
    probability?: number;
    min_probability?: number;
    max_probability?: number;
};

const ProbabilityGraph = ({ cdf_max, cdf_min }: { cdf_max: number[], cdf_min: number[] | null }) => {

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
                <AreaChart data={plot_array}>
                    <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    <XAxis
                        dataKey="index"
                        type="number"
                        domain={[0, cdf_max.length - 1]}
                    />
                    <YAxis domain={[0, 1]} />
                    <Tooltip />

                    {/* FIX: Changed from cdf_min to !cdf_min */}
                    {!cdf_min ? (
                        <Area
                            type="monotone"
                            dataKey="probability"
                            stroke="#8884d8"
                            fillOpacity={1}
                            fill="url(#colorUv)"
                            animationBegin={200}
                            animationDuration={1300}
                        />
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
                        </>
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ProbabilityGraph;