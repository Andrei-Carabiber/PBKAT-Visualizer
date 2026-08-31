import React, { useEffect } from "react";
import { useCompareStore } from "@/store/useCompareStore";
import { useNavigate } from "react-router-dom";
import SmallResultDisplay from "@/components/main/compare_mode/SmallResultDisplay.tsx";
import SmallNodeViewer from "@/components/main/compare_mode/SmallNodeViewer.tsx";
import { aggregateConnections } from "@/lib/utils.ts";
import SaveComparisonResults from "@/components/main/compare_mode/SaveComparisonResults.tsx";

const CompareView = () => {
    const { items, clearCompare } = useCompareStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!items || items.length < 2) {
            clearCompare();
            navigate("/", { replace: true });
        }
    }, [items, clearCompare, navigate]);

    if (!items || items.length < 2) {
        return null;
    }

    const gridStyle = {
        "--total-cols": items.length,
    } as React.CSSProperties;

    const gridRowClass =
        "grid w-max min-w-full gap-x-6 grid-cols-[repeat(var(--total-cols),calc(50%-12px))]";

    return (
        <div className="flex flex-col h-screen w-full bg-background p-6 gap-6">
            <header className="flex items-center justify-between pb-4 border-b border-border shrink-0">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Side-by-Side Comparison</h1>
                    <p className="text-sm text-muted-foreground">
                        Comparing:{" "}
                        {items.map((item) => (
                            <span key={item.id + item.name} className="font-semibold text-foreground mr-2">
                                {item.name}
                            </span>
                        ))}
                    </p>
                </div>

                <SaveComparisonResults />
            </header>

            {/* Scroll container with both overflow-y-auto and overflow-x-auto */}
            <div
                style={gridStyle}
                className="flex flex-col gap-6 flex-1 min-h-0 overflow-x-auto overflow-y-auto pr-1 pb-4"
            >
                {/* 1. Header / Name Row */}
                <div className={gridRowClass}>
                    {items.map((item) => (
                        <div key={`header-${item.id}`} className="border-b pb-2">
                            <span className="font-medium text-sm text-card-foreground">{item.name}</span>
                        </div>
                    ))}
                </div>

                {/* 2. Results Row */}
                <div id="result-box-comparison" className={gridRowClass}>
                    {items.map((item) => (
                        <div key={`result-${item.id}`} className="flex flex-col gap-2 h-full">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Result</h3>
                            <div className="rounded-md border bg-background/50 p-2 flex-1">
                                <SmallResultDisplay settings={item.settings} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* 3. Code Row */}
                <div id="code-box-comparison" className={gridRowClass}>
                    {items.map((item) => (
                        <div key={`code-${item.id}`} className="flex flex-col gap-2 h-full">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Code</h3>
                            <pre className="text-xs font-mono bg-muted/60 text-muted-foreground p-3 rounded-md overflow-x-auto border border-border/50 flex-1 min-h-0">
                                <code>{item.settings.code}</code>
                            </pre>
                        </div>
                    ))}
                </div>

                {/* 4. Node View Row (Independent Pan/Zoom) */}
                <div id="node-editor-comparison" className={gridRowClass}>
                    {items.map((item) => {
                        const id = `viewer-${item.id}`;

                        return (
                            <div key={`node-${item.id}`} className="flex flex-col gap-2 h-full">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase">Node View</h3>
                                <div className="rounded-md border border-border/50 bg-background/50 h-72 w-full overflow-hidden">
                                    <SmallNodeViewer
                                        id={id}
                                        nodes={item.settings.graph.nodes || []}
                                        edges={item.settings.graph.edges || []}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 5. Network Goal */}
                <div id="network-goal-comparison" className={gridRowClass}>
                    {items.map((item) => {
                        const aggregatedGoals = aggregateConnections(item.settings.goal);

                        return (
                            <div key={`goal-${item.id}`} className="flex flex-col gap-2 h-full">
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
                </div>

                {/* 6. Network Capacity */}
                <div id="network-capacity-comparison" className={gridRowClass}>
                    {items.map((item) => {
                        const aggregatedCapacities = aggregateConnections(item.settings.networkCapacity);

                        return (
                            <div key={`capacity-${item.id}`} className="flex flex-col gap-2 h-full">
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
        </div>
    );
};

export default CompareView;