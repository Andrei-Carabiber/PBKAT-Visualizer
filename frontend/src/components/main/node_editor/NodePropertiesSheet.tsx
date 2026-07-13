import {Sheet, SheetContent, SheetTitle, SheetHeader} from "@/components/ui/sheet.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import type {Dispatch, SetStateAction} from "react";
import type {Node} from "@xyflow/react";
import type {NodeData} from "@/components/main/node_editor/nodeEditor.tsx";
import {convertToProbability, zeroOrGreater} from "@/components/main/node_editor/utils.ts";

type props = {
    sheetOpen: boolean;
    setSheetOpen: Dispatch<SetStateAction<boolean>>;
    selectedNode: Node<NodeData> | null;
    updateNodeData: (id: string, patch: Record<string, any>) => void;
    takeSnapshot: () => void;
}

const NodePropertiesSheet = ({sheetOpen, setSheetOpen, selectedNode, updateNodeData, takeSnapshot}: props) => {
    return (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Node Properties</SheetTitle>
                </SheetHeader>

                {selectedNode && (
                    <div className="flex flex-col gap-4 p-4">

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="node-label">Label</Label>
                            <Input
                                id="node-label"
                                value={selectedNode.data.nodeLabel ?? ''}
                                onFocus={() => takeSnapshot()}
                                onChange={(e) => updateNodeData(selectedNode.id, {nodeLabel: e.target.value})}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="node-coh-time">Coherence Time</Label>
                            <Input
                                id="node-coh-time"
                                type="number"
                                step={1}
                                value={selectedNode.data.coherence_time ?? 1}
                                onFocus={() => takeSnapshot()}
                                onChange={(e) => updateNodeData(selectedNode.id, {coherence_time: zeroOrGreater(Number(e.target.value))})}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="node-cr-prob">Create Probability</Label>
                            <Input
                                id="node-cr-prob"
                                type="number"
                                step={0.01}
                                value={selectedNode.data.create_prob ?? 1}
                                onFocus={() => takeSnapshot()}
                                onChange={(e) => updateNodeData(selectedNode.id, {create_prob: convertToProbability(Number(e.target.value))})}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="node-cr-quality">Create Quality</Label>
                            <Input
                                id="node-cr-quality"
                                type="number"
                                step={0.01}
                                value={selectedNode.data.create_quality ?? 1}
                                onFocus={() => takeSnapshot()}
                                onChange={(e) => updateNodeData(selectedNode.id, {create_quality: convertToProbability(Number(e.target.value))})}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="node-swap-prob">Swap Probability</Label>
                            <Input
                                id="node-swap-prob"
                                type="number"
                                step={0.01}
                                value={selectedNode.data.swap_prob ?? 1}
                                onFocus={() => takeSnapshot()}
                                onChange={(e) => updateNodeData(selectedNode.id, {swap_prob: convertToProbability(Number(e.target.value))})}
                            />
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
};

export default NodePropertiesSheet;
