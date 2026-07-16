import { useMemo, useState } from "react";
import { useRunEngine } from "@/store/runEngine.ts";
import type { Node } from "@xyflow/react";
import type { NodeData } from "@/components/main/node_editor/nodeEditor.tsx";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover.tsx";

import { Button } from "@/components/ui/button.tsx";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command.tsx";

import { Badge } from "@/components/ui/badge.tsx";
import { Field } from "@/components/ui/field.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";

const NetworkGoalBox = () => {
    const { getGraphCallback } = useRunEngine();

    let nodes: Node<NodeData>[] = [];
    if (getGraphCallback) {
        nodes = getGraphCallback().nodes;
    }

    const possibleConnections = useMemo(() => {
        const connections: string[] = [];

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i; j < nodes.length; j++) {
                connections.push(
                    `${nodes[i].data.nodeLabel} ~ ${nodes[j].data.nodeLabel}`
                );
            }
        }

        return connections.sort();
    }, [nodes]);

    const [activeConnections, setActiveConnections] = useState<string[]>([]);
    const [disabled, setDisabled] = useState(true);
    const [open, setOpen] = useState(false);

    return (
        <div className="w-full h-full rounded-lg border bg-background px-3 py-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex justify-between gap-3">
                    <p className="font-medium w-fit">Set Network Goal</p>

                    <Badge className="w-fit text-sm p-2" variant="outline">
                        {activeConnections.length} selected
                    </Badge>
                </div>

                <Field orientation="horizontal" className="gap-2 w-fit">
                    Disabled
                    <Checkbox
                        checked={disabled}
                        onClick={() => setDisabled((v) => !v)}
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
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild disabled={disabled}>
                            <Button
                                className="flex-1"
                                variant="outline"
                                disabled={disabled}
                            >
                                Add connection
                            </Button>
                        </PopoverTrigger>

                        <PopoverContent className="w-80 p-0">
                            <Command>
                                <CommandInput placeholder="Search connections..." />

                                <CommandList>
                                    <CommandEmpty>
                                        No connection found.
                                    </CommandEmpty>

                                    <CommandGroup>
                                        {possibleConnections
                                            .filter(
                                                (c) =>
                                                    !activeConnections.includes(
                                                        c
                                                    )
                                            )
                                            .map((c) => (
                                                <CommandItem
                                                    key={c}
                                                    value={c}
                                                    onSelect={() => {
                                                        setActiveConnections(
                                                            (prev) => [
                                                                ...prev,
                                                                c,
                                                            ]
                                                        );
                                                        setOpen(false);
                                                    }}
                                                >
                                                    {c}
                                                </CommandItem>
                                            ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    {activeConnections.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveConnections([])}
                        >
                            Clear all
                        </Button>
                    )}
                </div>

                {activeConnections.length === 0 ? (
                    <p className="mt-6 text-sm text-muted-foreground">
                        No required connections selected.
                    </p>
                ) : (
                    <div className="mt-6 flex flex-wrap gap-2">
                        {activeConnections.map((connection) => (
                            <Badge
                                key={connection}
                                variant="secondary"
                                className="cursor-pointer select-none px-3 py-2 text-base transition-colors hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() =>
                                    setActiveConnections((prev) =>
                                        prev.filter((c) => c !== connection)
                                    )
                                }
                            >
                                {connection}
                                <span className="ml-2 text-xs">✕</span>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NetworkGoalBox;