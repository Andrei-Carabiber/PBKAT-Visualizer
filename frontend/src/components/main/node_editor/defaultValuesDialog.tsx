// DefaultValuesContent.tsx
import { useEffect, useState } from "react";
import { DEFAULT_EDGE_VALUES, DEFAULT_NODE_VALUES, useCustomization } from "@/store/customization.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";

type Props = {
    onBack: () => void;
};

const DefaultValuesContent = ({ onBack }: Props) => {
    const { defaultNodeValues, defaultEdgeValues, setDefaultNodeValues, setDefaultEdgeValues } = useCustomization();

    const [nodeValues, setNodeValues] = useState(defaultNodeValues);
    const [edgeValues, setEdgeValues] = useState(defaultEdgeValues);

    useEffect(() => {
        setNodeValues(defaultNodeValues);
        setEdgeValues(defaultEdgeValues);
    }, [defaultNodeValues, defaultEdgeValues]);

    const handleApply = () => {
        setDefaultEdgeValues(edgeValues);
        setDefaultNodeValues(nodeValues);
        onBack();
    };

    const handleReset = () => {
        setDefaultNodeValues(DEFAULT_NODE_VALUES);
        setDefaultEdgeValues(DEFAULT_EDGE_VALUES);
        setNodeValues(DEFAULT_NODE_VALUES);
        setEdgeValues(DEFAULT_EDGE_VALUES);
    };

    return (
        <div className="flex flex-col gap-6 py-2">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* Nodes Section */}
                <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Default Node Values</h4>
                    <div className="grid gap-2">
                        <Label>Coherence Time</Label>
                        <Input
                            type="number"
                            min={0}
                            value={nodeValues.coherence_time}
                            onChange={(e) => setNodeValues({ ...nodeValues, coherence_time: Number(e.target.value) })}
                        />

                        <Label>Create Probability</Label>
                        <Input
                            type="number"
                            min={0}
                            max={1}
                            step={0.1}
                            value={nodeValues.create_prob}
                            onChange={(e) => setNodeValues({ ...nodeValues, create_prob: Number(e.target.value) })}
                        />

                        <Label>Create Quality</Label>
                        <Input
                            type="number"
                            min={0}
                            max={1}
                            step={0.1}
                            value={nodeValues.create_quality}
                            onChange={(e) => setNodeValues({ ...nodeValues, create_quality: Number(e.target.value) })}
                        />

                        <Label>Swap Probability</Label>
                        <Input
                            type="number"
                            min={0}
                            max={1}
                            step={0.1}
                            value={nodeValues.swap_prob}
                            onChange={(e) => setNodeValues({ ...nodeValues, swap_prob: Number(e.target.value) })}
                        />
                    </div>
                </div>

                {/* Edges Section */}
                <div className="space-y-3 pt-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Default Edge Values</h4>
                    <div className="grid gap-2">
                        <Label>Distance</Label>
                        <Input
                            type="number"
                            min={0}
                            value={edgeValues.distance}
                            onChange={(e) => setEdgeValues({ ...edgeValues, distance: Number(e.target.value) })}
                        />

                        <Label>Transmit Probability</Label>
                        <Input
                            type="number"
                            min={0}
                            max={1}
                            step={0.1}
                            value={edgeValues.transmit_prob}
                            onChange={(e) => setEdgeValues({ ...edgeValues, transmit_prob: Number(e.target.value) })}
                        />

                        <Label>UCreate Quality</Label>
                        <Input
                            type="number"
                            min={0}
                            max={1}
                            step={0.1}
                            value={edgeValues.uCreate_quality}
                            onChange={(e) => setEdgeValues({ ...edgeValues, uCreate_quality: Number(e.target.value) })}
                        />

                        <Label>UCreate Probability</Label>
                        <Input
                            type="number"
                            min={0}
                            max={1}
                            step={0.1}
                            value={edgeValues.uCreate_prob}
                            onChange={(e) => setEdgeValues({ ...edgeValues, uCreate_prob: Number(e.target.value) })}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
                <Button className="rounded-sm p-4" variant="outline" onClick={handleReset}>
                    Reset Defaults
                </Button>
                <div className="flex gap-2">
                    <Button className="rounded-sm p-4" variant="outline" onClick={onBack}>
                        Cancel
                    </Button>
                    <Button className="rounded-sm p-4" onClick={handleApply}>
                        Apply
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DefaultValuesContent;