import {useState} from "react";
import {DEFAULT_EDGE_VALUES, DEFAULT_NODE_VALUES, useCustomization} from "@/store/customization.ts";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {useReactFlow} from "@xyflow/react";
import {toast} from "sonner";

type Props = {
    onBack: () => void;
};

const GlobalValuesDialog = ({onBack}: Props) => {
    const {setDefaultNodeValues, setDefaultEdgeValues} = useCustomization();

    const {getEdges, getNodes, setNodes, setEdges} = useReactFlow();

    const [nodeValues, setNodeValues] = useState(DEFAULT_NODE_VALUES);
    const [edgeValues, setEdgeValues] = useState(DEFAULT_EDGE_VALUES);

    const handleApply = () => {

        const updatedNodes = getNodes().map((node) => ({
            ...node,
            data: {
                ...node.data,
                ...nodeValues
            }
        }));

        const updatedEdges = getEdges().map((edge) => ({
            ...edge,
            data: {
                ...edge.data,
                ...edgeValues
            }
        }));

        setNodes(updatedNodes);
        setEdges(updatedEdges);
        toast.success("Successfully set values for all nodes and edges")
        onBack();
    };

    const handleReset = () => {
        setNodeValues(DEFAULT_NODE_VALUES);
        setEdgeValues(DEFAULT_EDGE_VALUES);
    };

    const applyToAllNodes = (key: keyof typeof nodeValues, value: number) => {
        const updatedNodes = getNodes().map((node) => ({
            ...node,
            data: {
                ...node.data,
                [key]: value,
            },
        }));
        setNodes(updatedNodes);
    };

    // Helper to update a single key in all React Flow edges
    const applyToAllEdges = (key: keyof typeof edgeValues, value: number) => {
        const updatedEdges = getEdges().map((edge) => ({
            ...edge,
            data: {
                ...edge.data,
                [key]: value,
            },
        }));
        setEdges(updatedEdges);
    };

    return (
        <div className="flex flex-col gap-6 py-2">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* Nodes Section */}
                <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Node Values</h4>
                    <div className="grid gap-2">
                        {/* Coherence Time */}
                        <Label>Coherence Time</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                min={0}
                                value={nodeValues.coherence_time}
                                onChange={(e) => setNodeValues({...nodeValues, coherence_time: Number(e.target.value)})}
                            />
                            <Button className="p-3 rounded-sm"
                                    onClick={() => applyToAllNodes("coherence_time", nodeValues.coherence_time)}>
                                Apply
                            </Button>
                        </div>

                        {/* Create Probability */}
                        <Label>Create Probability</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                min={0}
                                max={1}
                                step={0.1}
                                value={nodeValues.create_prob}
                                onChange={(e) => setNodeValues({...nodeValues, create_prob: Number(e.target.value)})}
                            />
                            <Button className="p-3 rounded-sm"
                                    onClick={() => applyToAllNodes("create_prob", nodeValues.create_prob ?? 1)}>
                                Apply
                            </Button>
                        </div>

                        {/* Create Quality */}
                        <Label>Create Quality</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                min={0}
                                max={1}
                                step={0.1}
                                value={nodeValues.create_quality}
                                onChange={(e) => setNodeValues({...nodeValues, create_quality: Number(e.target.value)})}
                            />
                            <Button className="p-3 rounded-sm"
                                    onClick={() => applyToAllNodes("create_quality", nodeValues.create_quality ?? 1)}>
                                Apply
                            </Button>
                        </div>

                        {/* Swap Probability */}
                        <Label>Swap Probability</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                min={0}
                                max={1}
                                step={0.1}
                                value={nodeValues.swap_prob}
                                onChange={(e) => setNodeValues({...nodeValues, swap_prob: Number(e.target.value)})}
                            />
                            <Button className="p-3 rounded-sm"
                                    onClick={() => applyToAllNodes("swap_prob", nodeValues.swap_prob ?? 1)}>
                                Apply
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Edges Section */}
                <div className="space-y-3 pt-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Edge Values</h4>
                    <div className="grid gap-2">
                        {/* Distance */}
                        <Label>Distance</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                min={0}
                                value={edgeValues.distance}
                                onChange={(e) => setEdgeValues({...edgeValues, distance: Number(e.target.value)})}
                            />
                            <Button className="p-3 rounded-sm"
                                    onClick={() => applyToAllEdges("distance", edgeValues.distance)}>
                                Apply
                            </Button>
                        </div>

                        {/* Transmit Probability */}
                        <Label>Transmit Probability</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                min={0}
                                max={1}
                                step={0.1}
                                value={edgeValues.transmit_prob}
                                onChange={(e) => setEdgeValues({...edgeValues, transmit_prob: Number(e.target.value)})}
                            />
                            <Button className="p-3 rounded-sm"
                                    onClick={() => applyToAllEdges("transmit_prob", edgeValues.transmit_prob)}>
                                Apply
                            </Button>
                        </div>

                        {/* UCreate Quality */}
                        <Label>UCreate Quality</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                min={0}
                                max={1}
                                step={0.1}
                                value={edgeValues.uCreate_quality}
                                onChange={(e) => setEdgeValues({
                                    ...edgeValues,
                                    uCreate_quality: Number(e.target.value)
                                })}
                            />
                            <Button className="p-3 rounded-sm"
                                    onClick={() => applyToAllEdges("uCreate_quality", edgeValues.uCreate_quality ?? 1)}>
                                Apply
                            </Button>
                        </div>

                        {/* UCreate Probability */}
                        <Label>UCreate Probability</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                min={0}
                                max={1}
                                step={0.1}
                                value={edgeValues.uCreate_prob}
                                onChange={(e) => setEdgeValues({...edgeValues, uCreate_prob: Number(e.target.value)})}
                            />
                            <Button className="p-3 rounded-sm"
                                    onClick={() => applyToAllEdges("uCreate_prob", edgeValues.uCreate_prob ?? 1)}>
                                Apply
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
                <div className="flex gap-2">
                    <Button className="rounded-sm p-4"
                            variant="outline"
                            onClick={handleReset}>
                        Reset
                    </Button>
                    <Button variant="outline"
                            className="rounded-sm p-4"
                            onClick={() => {
                                setDefaultNodeValues(nodeValues);
                                setDefaultEdgeValues(edgeValues);
                                toast.success("Successfully set values as default")
                            }}
                    >
                        Apply also as default values
                    </Button>
                </div>
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

export default GlobalValuesDialog;