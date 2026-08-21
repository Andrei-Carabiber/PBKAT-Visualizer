import {useState} from "react";
import {Area, AreaChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {Slider} from "@/components/ui/slider.tsx";
import {downsampleData} from "@/lib/utils.ts";

interface WernerGraphProps {
    wernerArray: number[];
    estimatedMode: boolean;
    zoomLeft?: string | number;
    zoomRight?: string | number;
    onZoomChange?: (left: string | number, right: string | number) => void;
    onResetZoom?: () => void;
}

const WernerGraph = ({
                         wernerArray,
                         estimatedMode,
                         zoomLeft,
                         zoomRight,
                         onZoomChange,
                         onResetZoom
                     }: WernerGraphProps) => {

    type PlotPoint = {
        index: number;
        werner: number | null;
    };

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

    // Zoom state management with fallback to internal state
    const [internalLeft, setInternalLeft] = useState<string | number>("dataMin");
    const [internalRight, setInternalRight] = useState<string | number>("dataMax");

    const left = zoomLeft !== undefined ? zoomLeft : internalLeft;
    const right = zoomRight !== undefined ? zoomRight : internalRight;
    const [refAreaLeft, setRefAreaLeft] = useState<string | number>("");
    const [refAreaRight, setRefAreaRight] = useState<string | number>("");

    const rawPlotArray: PlotPoint[] = wernerArray.map((value, index) => ({
        werner: value === -1 ? null : value,
        index,
    }))

    const plot_array: PlotPoint[] = downsampleData(rawPlotArray, left, right, 500)

    const ZOOM_MIN_DIFFERENCE = 3;

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

        // Notify parent component if callback exists, otherwise update locally
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

        // Notify parent component to reset, otherwise reset locally
        if (onResetZoom) {
            onResetZoom();
        } else {
            setInternalLeft("dataMin");
            setInternalRight("dataMax");
        }
    };

    const [YDomain, setYDomain] = useState([0, 1]);

    return (
        <div className="w-full h-full min-h-75 flex">
            <div className="flex justify-between h-[90%] w-12 items-center mr-2">
                <div className="h-full flex flex-col justify-between text-sm text-muted-foreground">
                    <p>{YDomain[1]}</p>
                    <p>{YDomain[0]}</p>
                </div>
                <Slider value={YDomain}
                        onValueChange={(value) => setYDomain(value)}
                        min={0}
                        max={1}
                        step={0.01}
                        orientation="vertical"
                        className="h-full"
                />
            </div>
            <div className="w-full h-full min-h-75 flex flex-col">

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

                <div className="w-full flex-1 min-h-65">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={plot_array}
                            margin={{top: 10, right: 30, left: 20, bottom: 0}}
                            onMouseDown={(e) => e && setRefAreaLeft(e.activeLabel ?? "")}
                            onMouseMove={(e) => refAreaLeft && e && setRefAreaRight(e.activeLabel ?? "")}
                            onMouseUp={zoom}
                        >
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
                                domain={[left, right]}
                                allowDataOverflow={true}
                                height={52}
                                label={{position: "insideBottomRight", value: "Time units", offset: 5}}
                            />
                            <YAxis
                                domain={YDomain}
                                allowDataOverflow={true}
                                width={80}
                                label={{position: "left", value: "Quality", angle: -90, offset: -15, dy: -30}}
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
                                isAnimationActive={false}
                            />

                            {refAreaLeft && refAreaRight ? (
                                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#8884d8"
                                               fillOpacity={0.3}/>
                            ) : null}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default WernerGraph;