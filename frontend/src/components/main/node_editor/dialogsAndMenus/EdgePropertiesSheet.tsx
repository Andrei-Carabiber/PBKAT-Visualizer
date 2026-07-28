import {Sheet, SheetContent, SheetTitle, SheetHeader} from "@/components/ui/sheet.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import type {Dispatch, SetStateAction} from "react";
import type {Edge} from "@xyflow/react";
import type {EdgeData} from "@/components/main/node_editor/nodeEditor.tsx";
import {convertToProbability, zeroOrGreater} from "@/components/main/node_editor/utils.ts";

type props = {
    sheetOpen: boolean;
    setSheetOpen: Dispatch<SetStateAction<boolean>>;
    selectedEdge: Edge<EdgeData> | null;
    updateEdgeData: (id: string, patch: Partial<EdgeData>) => void; // Updated type safety patch signature
    takeSnapshot: () => void;
}

const EdgePropertiesSheet = ({sheetOpen, setSheetOpen, selectedEdge, updateEdgeData, takeSnapshot}: props) => {
    return (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Edge Properties</SheetTitle>
                </SheetHeader>

                {selectedEdge && (
                    <div className="flex flex-col gap-4 p-4">

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="edge-distance">Distance</Label>
                            <Input
                                id="edge-distance"
                                type="number"
                                step={1}
                                value={selectedEdge.data?.distance ?? 100}
                                onFocus={() => takeSnapshot()}
                                onChange={(e) => updateEdgeData(selectedEdge.id, { distance: zeroOrGreater(Number(e.target.value)) })}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="edge-trans-prob">Transmission Probability</Label>
                            <Input
                                id="edge-trans-prob"
                                type="number"
                                step={0.01}
                                value={selectedEdge.data?.transmit_prob ?? 1}
                                onFocus={() => takeSnapshot()}
                                onChange={(e) => updateEdgeData(selectedEdge.id, { transmit_prob: convertToProbability(Number(e.target.value))})}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="node-UCreate-prob">UCreate Probability</Label>
                            <Input
                                id="node-UCreate-prob"
                                type="number"
                                step={0.01}
                                value={selectedEdge.data?.uCreate_prob ?? 1}
                                onFocus={() => takeSnapshot()}
                                onChange={(e) => updateEdgeData(selectedEdge.id, {uCreate_prob: convertToProbability(Number(e.target.value))})}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="node-UCreate-quality">UCreate Quality</Label>
                            <Input
                                id="node-UCreate-quality"
                                type="number"
                                step={0.01}
                                value={selectedEdge.data?.uCreate_quality ?? 1}
                                onFocus={() => takeSnapshot()}
                                onChange={(e) => updateEdgeData(selectedEdge.id, {uCreate_quality: convertToProbability(Number(e.target.value))})}
                            />
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
};

export default EdgePropertiesSheet;