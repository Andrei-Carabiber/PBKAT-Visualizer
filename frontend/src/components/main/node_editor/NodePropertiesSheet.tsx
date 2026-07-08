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
}

const NodePropertiesSheet = ({sheetOpen, setSheetOpen, selectedNode, updateNodeData}: props) => {
    return (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Node Properties</SheetTitle>
                </SheetHeader>

                {selectedNode && (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="node-label">Label</Label>
                            <Input
                                id="node-label"
                                value={selectedNode.data.label ?? ''}
                                onChange={(e) =>
                                    updateNodeData(selectedNode.id, {label: e.target.value})
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
