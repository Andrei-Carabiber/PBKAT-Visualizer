import { useState } from "react";
import { Area, AreaChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type PlotPoint = {
    index: number;
    probability?: number;
    min_probability?: number;
    max_probability?: number;
};

interface ProbabilityGraphProps {
    cdf_max: number[];
    cdf_min: number[] | null;
    estimatedMode: boolean;
    // Synced zoom props (optional: if not provided, it acts independently)
    zoomLeft?: string | number;
    zoomRight?: string | number;
    onZoomChange?: (left: string | number, right: string | number) => void;
    onResetZoom?: () => void;
}

const ProbabilityGraph = ({
                              cdf_max,
                              cdf_min,
                              estimatedMode,
                              zoomLeft,
                              zoomRight,
                              onZoomChange,
                              onResetZoom
                          }: ProbabilityGraphProps) => {

    // Internal fallback state if parent-controlled props are not passed
    const [internalLeft, setInternalLeft] = useState<string | number>("dataMin");
    const [internalRight, setInternalRight] = useState<string | number>("dataMax");

    const left = zoomLeft !== undefined ? zoomLeft : internalLeft;
    const right = zoomRight !== undefined ? zoomRight : internalRight;

    const [refAreaLeft, setRefAreaLeft] = useState<string | number>("");
    const [refAreaRight, setRefAreaRight] = useState<string | number>("");

    const ZOOM_MIN_DIFFERENCE = 3;

    const plot_array: PlotPoint[] = !cdf_min
        ? cdf_max.map((value, index) => ({
            probability: value,
            index: index
        }))
        : cdf_max.map((value, index) => ({
            min_probability: cdf_min[index],
            max_probability: value,
            index: index
        }));

    const zoom = () => {
        let l = refAreaLeft;
        let r = refAreaRight;

        if (l === r || r === "") {
            setRefAreaLeft("");
            setRefAreaRight("");
            return;
        }

        if (typeof l === "number" && typeof r === "number" && l > r) {
            [l, r] = [r, l];
        }

        if (typeof l === "number" && typeof r === "number" && r - l < ZOOM_MIN_DIFFERENCE) {
            setRefAreaLeft("");
            setRefAreaRight("");
            return;
        }

        setRefAreaLeft("");
        setRefAreaRight("");

        if (onZoomChange) {
            onZoomChange(l, r);
        } else {
            setInternalLeft(l);
            setInternalRight(r);
        }
    };

    const zoomOut = () => {
        setRefAreaLeft("");
        setRefAreaRight("");
        if (onResetZoom) {
            onResetZoom();
        } else {
            setInternalLeft("dataMin");
            setInternalRight("dataMax");
        }
    };

    return (
        <div className="w-full h-full min-h-[300px] flex flex-col">
            {/* Optional Header with Zoom Out Button */}
            <div className="flex justify-end px-4 py-1">
                {(left !== "dataMin" || right !== "dataMax") && (
                    <button
                        onClick={zoomOut}
                        className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded-md border shadow-sm hover:bg-accent"
                    >
                        Zoom Out
                    </button>
                )}
            </div>

            <div className="w-full flex-1 min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={plot_array}
                        margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
                        onMouseDown={(e) => e && setRefAreaLeft(e.activeLabel ?? "")}
                        onMouseMove={(e) => refAreaLeft && e && setRefAreaRight(e.activeLabel ?? "")}
                        onMouseUp={zoom}
                    >
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
                            domain={[left, right]}
                            allowDataOverflow={true}
                            height={52}
                            label={{ position: "insideBottomRight", value: "Time units", offset: 5 }}
                        />
                        <YAxis
                            domain={[0, 1]}
                            allowDataOverflow={true}
                            width={80}
                            label={{ position: "left", value: "Probability", angle: -90, offset: -15, dy: -45 }}
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
                                    content={({ active, payload }) => {
                                        const point = payload?.[0]?.payload as PlotPoint | undefined;
                                        if (!active || !point || point.probability === null) return null;

                                        return (
                                            <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
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
                                    content={({ active, payload }) => {
                                        const point = payload?.[0]?.payload as PlotPoint | undefined;
                                        if (!active || !point || point.probability === null) return null;

                                        return (
                                            <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
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

                        {refAreaLeft && refAreaRight ? (
                            <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#8884d8" fillOpacity={0.3} />
                        ) : null}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ProbabilityGraph;