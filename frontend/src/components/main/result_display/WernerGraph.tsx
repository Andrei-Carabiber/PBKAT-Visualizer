import {Area, AreaChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";

const WernerGraph = ({wernerArray, estimatedMode}: { wernerArray: number[], estimatedMode: boolean }) => {

    type PlotPoint = {
        index: number;
        werner: number | null;
    };

    const plot_array: PlotPoint[] = wernerArray.map((value, index) => ({
        werner: value === -1 ? null : value,
        index,
    }));

    const unavailableRanges = wernerArray.reduce<{ start: number; end: number }[]>(
        (ranges, value, index) => {
            if (value !== -1) return ranges;

            const previous = ranges.at(-1);
            if (previous && previous.end === index - 1) {
                previous.end = index;
            } else {
                ranges.push({start: index, end: index});
            }
            return ranges;
        },
        []
    );

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

                    {unavailableRanges.map(({start, end}) => (
                        <ReferenceArea
                            key={`${start}-${end}`}
                            x1={start}
                            x2={end}
                            y1={0}
                            y2={1}
                            fill="var(--muted)"
                            fillOpacity={1}
                        />
                    ))}

                    <XAxis
                        dataKey="index"
                        type="number"
                        domain={[0, wernerArray.length - 1]}
                        height={52}
                        label={{ position: "insideBottomRight", value: "Time units", offset: 5 }}
                    />
                    <YAxis
                        domain={[0, 1]}
                        width={80}
                        label={{ position: "left", value: "Quality", angle: -90, offset: -15, dy: -30}}
                    />
                    <Tooltip
                        content={({active, payload}) => {
                            const point = payload?.[0]?.payload as PlotPoint | undefined;
                            if (!active || !point || point.werner === null) return null;

                            return (
                                <div
                                    className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
                                    <p>Time unit: {point.index}</p>
                                    {estimatedMode ? (
                                        <p>Quality: {point.werner.toFixed(3)}</p>
                                    ) : (
                                        <p>Quality: {point.werner}</p>
                                    )}
                                </div>
                            );
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="werner"
                        stroke="#8884d8"
                        fillOpacity={1}
                        fill="url(#colorUv)"
                        connectNulls={false}
                        animationBegin={200}
                        animationDuration={1300}
                    />

                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default WernerGraph;
