import {useMemo} from "react";
import {useRunEngine} from "@/store/runEngine.ts";
import type {Node} from "@xyflow/react";
import type {NodeData} from "@/components/main/node_editor/nodeEditor.tsx";

import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover.tsx";

import {Button} from "@/components/ui/button.tsx";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command.tsx";

import {Badge} from "@/components/ui/badge.tsx";
import {Field} from "@/components/ui/field.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {useCustomization} from "@/store/customization.ts";

export const aggregateConnections = (items?: Array<{ id: string; label: string }>) => {
    if (!items || items.length === 0) return [];

    const countMap = new Map<string, { count: number; firstId: string }>();

    for (const item of items) {
        const existing = countMap.get(item.label);
        if (existing) {
            existing.count += 1;
        } else {
            countMap.set(item.label, { count: 1, firstId: item.id });
        }
    }

    return Array.from(countMap.entries()).map(([label, data]) => ({
        id: data.firstId,
        label,
        count: data.count,
    }));
};

const NetworkGoalBox = () => {

    const {
        getGraphCallback,
        goalConnections,
        setGoalConnections,
        networkGoalDisabled: disabled,
        setNetworkGoalDisabled: setDisabled
    } = useRunEngine();

    const {setGoalPopoverOpen, goalPopoverOpen} = useCustomization()

    let nodes: Node<NodeData>[] = [];
    if (getGraphCallback) {
        nodes = getGraphCallback().nodes;
    }

    const possibleConnections = useMemo(() => {
        const connections: string[] = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i; j < nodes.length; j++) {
                connections.push(
                    `"${nodes[i].data.nodeLabel}" ~ "${nodes[j].data.nodeLabel}"`
                );
            }
        }
        return connections.sort((a, b) => a.localeCompare(b));
    }, [nodes]);

    // Aggregate active connections and build an O(1) lookup map for counts
    const aggregatedGoals = useMemo(
        () => aggregateConnections(goalConnections).sort((a, b) => a.label.localeCompare(b.label)),
        [goalConnections]
    );

    const countsMap = useMemo(() => {
        const map = new Map<string, number>();
        aggregatedGoals.forEach((item) => map.set(item.label, item.count));
        return map;
    }, [aggregatedGoals]);

    const handleAddConnection = (label: string) => {
        setGoalConnections((prev) => [
            ...prev,
            { id: crypto.randomUUID(), label }
        ].sort((a, b) => a.label.localeCompare(b.label)));
    };

    // Removes one instance of the connection when clicked
    const handleRemoveSingleInstance = (labelToRemove: string) => {
        setGoalConnections((prev) => {
            const index = prev.findIndex((c) => c.label === labelToRemove);
            if (index === -1) return prev;
            return [...prev.slice(0, index), ...prev.slice(index + 1)];
        });
    };

    return (
        <div className="w-full h-full rounded-lg border bg-accent text-accent-foreground px-3 py-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex justify-between gap-3">
                    <p className="font-medium w-fit">Network Goal</p>
                    <Badge className="w-fit text-sm p-2" variant="outline">
                        {goalConnections.length} selected
                    </Badge>
                </div>

                <Field orientation="horizontal" className="gap-2 w-fit">
                    Disabled
                    <Checkbox
                        checked={disabled}
                        onClick={() => setDisabled(!disabled)}
                    />
                </Field>
            </div>

            <div
                className={
                    disabled
                        ? "pointer-events-none opacity-40 transition-opacity"
                        : "transition-opacity"
                }
            >
                <div className="flex items-center gap-2">
                    <Popover open={goalPopoverOpen} onOpenChange={setGoalPopoverOpen}>
                        <PopoverTrigger asChild disabled={disabled}>
                            <Button
                                className="flex-1"
                                variant="outline"
                                disabled={disabled}
                            >
                                Add Goal
                            </Button>
                        </PopoverTrigger>

                        <PopoverContent
                            data-tour-elem="popover"
                            className="w-60 md:w-80 lg:w-100 p-0 z-[100000]"
                        >
                            <Command>
                                <CommandInput placeholder="Search connections..." />
                                <CommandList>
                                    <CommandEmpty>No connection found.</CommandEmpty>
                                    <CommandGroup>
                                        {possibleConnections.map((c) => {
                                            const count = countsMap.get(c) ?? 0;
                                            return (
                                                <CommandItem
                                                    key={c}
                                                    value={c}
                                                    onSelect={() => handleAddConnection(c)}
                                                    className="flex items-center justify-between"
                                                >
                                                    <span>{c}</span>
                                                    {count > 0 && (
                                                        <Badge variant="secondary" className="ml-2 font-mono">
                                                            {count}x
                                                        </Badge>
                                                    )}
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    {goalConnections.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setGoalConnections([])}
                        >
                            Clear all
                        </Button>
                    )}
                </div>

                {aggregatedGoals.length === 0 ? (
                    <p className="mt-6 text-sm text-muted-foreground">
                        No network goal active.
                    </p>
                ) : (
                    <div className="mt-6 flex overflow-x-auto gap-2 pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50">
                        {aggregatedGoals.map((connection) => (
                            <Badge
                                key={connection.label}
                                variant="secondary"
                                className="shrink-0 cursor-pointer select-none px-3 py-2 text-base transition-colors hover:bg-destructive hover:text-destructive-foreground inline-flex items-center gap-2"
                                onClick={() => handleRemoveSingleInstance(connection.label)}
                            >
                                <span>{connection.label}</span>
                                {connection.count > 1 && (
                                    <span className="font-mono text-xs opacity-75 bg-background/50 px-1.5 py-0.5 rounded">
                                        {connection.count}x
                                    </span>
                                )}
                                <span className="text-sm">✕</span>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NetworkGoalBox;