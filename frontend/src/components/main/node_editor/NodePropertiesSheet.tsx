import {Sheet, SheetContent, SheetTitle, SheetHeader} from "@/components/ui/sheet.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import type {Dispatch, SetStateAction} from "react";
import type {Node} from "@xyflow/react";
import type {NodeData} from "@/components/main/node_editor/nodeEditor.tsx";

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
                                value={selectedNode.data.label ?? ''}
                                onFocus={() => takeSnapshot()}
                                onChange={(e) => updateNodeData(selectedNode.id, {label: e.target.value})}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="node-transmission">Transmission</Label>
                            <Input
                                id="node-transmission"
                                value={selectedNode.data.color ?? ''}
                                onFocus={() => takeSnapshot()}
                                onChange={(e) =>
                                    updateNodeData(selectedNode.id, {color: e.target.value})
                                }
                            />
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
};

export default NodePropertiesSheet;
