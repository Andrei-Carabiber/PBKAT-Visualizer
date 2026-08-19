import { useMemo } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card.tsx";
import type { EdgeData, NodeData } from "@/components/main/node_editor/nodeEditor.tsx";
import { ScrollContainerWithShadow } from "@/components/web/header-buttons/scroll-container-with-shadow.tsx";
import { X } from "lucide-react";

export type ContextMenuData =
    | { type: "node"; data: NodeData }
    | { type: "edge"; data: EdgeData };

interface SmallInfoContextMenuProps {
    menu: ContextMenuData;
    closeMenu: () => void;
}

const InfoContextMenuSmall = ({ menu, closeMenu }: SmallInfoContextMenuProps) => {
    // Count valid (non-null / non-undefined) fields
    const attributeCount = useMemo(() => {
        return Object.values(menu.data).filter(
            (val) => val !== undefined && val !== null
        ).length;
    }, [menu.data]);

    // Calculate height (e.g., ~4.5rem/vh per attribute, capped at max height)
    const containerHeight = Math.min(Math.max(attributeCount * 7.5, 10), 25);

    return (
        <Card className="w-64 shadow-lg pt-1">
            <CardTitle className="flex justify-between w-full items-center p-3 pb-2 text-sm font-semibold">
                {menu.type === "node" ? "Node Details" : "Edge Details"}
                <X size={12} onClick={closeMenu} className="hover:cursor-pointer" />
            </CardTitle>
            <CardContent className="text-sm">
                <ScrollContainerWithShadow height={containerHeight}>
                    <div className="flex flex-col gap-2">
                        {menu.type === "node" ? (
                            <>
                                <div className="bg-muted p-2 rounded-sm">
                                    <div>Node Label:</div>
                                    <p className="font-medium">{menu.data.nodeLabel}</p>
                                </div>

                                <div className="bg-muted p-2 rounded-sm">
                                    <div>Coherence Time:</div>
                                    <p className="font-medium">{menu.data.coherence_time}</p>
                                </div>

                                {menu.data.create_prob !== undefined && (
                                    <div className="bg-muted p-2 rounded-sm">
                                        <div>Create Probability:</div>
                                        <p className="font-medium">{menu.data.create_prob}</p>
                                    </div>
                                )}

                                {menu.data.create_quality !== undefined && (
                                    <div className="bg-muted p-2 rounded-sm">
                                        <div>Create Quality:</div>
                                        <p className="font-medium">{menu.data.create_quality}</p>
                                    </div>
                                )}

                                {menu.data.swap_prob !== undefined && (
                                    <div className="bg-muted p-2 rounded-sm">
                                        <div>Swap Probability:</div>
                                        <p className="font-medium">{menu.data.swap_prob}</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="bg-muted p-2 rounded-sm">
                                    <div>Distance:</div>
                                    <p className="font-medium">{menu.data.distance}</p>
                                </div>

                                <div className="bg-muted p-2 rounded-sm">
                                    <div>Transmit Probability:</div>
                                    <p className="font-medium">{menu.data.transmit_prob}</p>
                                </div>

                                {menu.data.uCreate_prob !== undefined && (
                                    <div className="bg-muted p-2 rounded-sm">
                                        <div>uCreate Probability:</div>
                                        <p className="font-medium">{menu.data.uCreate_prob}</p>
                                    </div>
                                )}

                                {menu.data.uCreate_quality !== undefined && (
                                    <div className="bg-muted p-2 rounded-sm">
                                        <div>uCreate Quality:</div>
                                        <p className="font-medium">{menu.data.uCreate_quality}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </ScrollContainerWithShadow>
            </CardContent>
        </Card>
    );
};

export default InfoContextMenuSmall;