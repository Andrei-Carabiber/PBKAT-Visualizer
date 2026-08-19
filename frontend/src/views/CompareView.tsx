import {useEffect} from "react";
import {useCompareStore} from "@/store/useCompareStore";
import {useNavigate} from "react-router-dom";
import SmallResultDisplay from "@/components/main/compare_mode/SmallResultDisplay.tsx";
import SmallNodeViewer from "@/components/main/compare_mode/SmallNodeViewer.tsx";
import {aggregateConnections} from "@/lib/utils.ts";

const CompareView = () => {
    const {first, second, clearCompare} = useCompareStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!first || !second) {
            clearCompare();
            navigate("/", {replace: true});
        }
    }, [first, second, clearCompare, navigate]);

    if (!first || !second) {
        return null;
    }

    return (
        <div className="flex flex-col h-screen w-full bg-background p-6 gap-6">
            <header className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Side-by-Side Comparison</h1>
                    <p className="text-sm text-muted-foreground">
                        Comparing <span className="font-semibold text-foreground">{first.name}</span> with{" "}
                        <span className="font-semibold text-foreground">{second.name}</span>
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-2 gap-x-6 gap-y-6 flex-1 min-h-0 overflow-y-auto pr-1 auto-rows-min">
                {/* 1. Header / Name Row */}
                {[first, second].map((item, idx) => (
                    <div key={`header-${idx}`} className="border-b pb-2">
                        <span className="font-medium text-sm text-card-foreground">{item.name}</span>
                    </div>
                ))}

                {/* 2. Results Row */}
                {[first, second].map((item, idx) => (
                    <div key={`result-${idx}`} className="flex flex-col gap-2 h-full">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Result</h3>
                        <div className="rounded-md border bg-background/50 p-2 flex-1">
                            <SmallResultDisplay settings={item.settings}/>
                        </div>
                    </div>
                ))}

                {/* 3. Code Row */}
                {[first, second].map((item, idx) => (
                    <div key={`code-${idx}`} className="flex flex-col gap-2 h-full">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Code</h3>
                        <pre
                            className="text-xs font-mono bg-muted/60 text-muted-foreground p-3 rounded-md overflow-x-auto border border-border/50 flex-1 min-h-0">
                            <code>{item.settings.code}</code>
                        </pre>
                    </div>
                ))}

                {/* 4. Node View Row (Independent Pan/Zoom) */}
                {[first, second].map((item, idx) => {
                    const id = `viewer-${idx}`;

                    return (
                        <div key={`node-${idx}`} className="flex flex-col gap-2 h-full">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Node View</h3>
                            <div
                                className="rounded-md border border-border/50 bg-background/50 h-72 w-full overflow-hidden">
                                <SmallNodeViewer
                                    id={id}
                                    nodes={item.settings.graph.nodes || []}
                                    edges={item.settings.graph.edges || []}
                                />
                            </div>
                        </div>
                    );
                })}

                {/* 5. Network Goal */}
                {[first, second].map((item, idx) => {
                    const aggregatedGoals = aggregateConnections(item.settings.goal);

                    return (
                        <div key={`goal-${idx}`} className="flex flex-col gap-2 h-full">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Network Goal</h3>
                            <div className="rounded-md border border-border/50 bg-background/50 p-3 flex-1 flex flex-col justify-center min-h-16">
                                {item.settings.goalDisabled ? (
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                        <span className="text-xs text-muted-foreground italic">Disabled</span>
                                    </div>
                                ) : aggregatedGoals.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {aggregatedGoals.map((conn) => (
                                            <span
                                                key={conn.id}
                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-secondary"
                                            >
                                                <span>{conn.label}</span>
                                                {conn.count > 1 && (
                                                    <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-secondary">
                                                        x{conn.count}
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground italic">No goals configured</span>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* 6. Network Capacity */}
                {[first, second].map((item, idx) => {
                    const aggregatedCapacities = aggregateConnections(item.settings.networkCapacity);

                    return (
                        <div key={`capacity-${idx}`} className="flex flex-col gap-2 h-full">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Network Capacity</h3>
                            <div className="rounded-md border border-border/50 bg-background/50 p-3 flex-1 flex flex-col justify-center min-h-16">
                                {item.settings.capacityDisabled ? (
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                        <span className="text-xs text-muted-foreground italic">Disabled</span>
                                    </div>
                                ) : aggregatedCapacities.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {aggregatedCapacities.map((conn) => (
                                            <span
                                                key={conn.id}
                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border/50"
                                            >
                                                <span>{conn.label}</span>
                                                {conn.count > 1 && (
                                                    <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-muted-foreground/20 text-muted-foreground">
                                                        x{conn.count}
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground italic">No capacity limits configured</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CompareView;