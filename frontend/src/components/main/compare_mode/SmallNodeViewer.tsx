import { useState, useRef, useLayoutEffect } from "react";
import {
    Background,
    Controls,
    type Edge,
    type EdgeTypes,
    type FitViewOptions,
    type Node,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import type { EdgeData, NodeData } from "@/components/main/node_editor/nodeEditor.tsx";
import { useTheme } from "@/components/theme-provider.tsx";
import '../node_editor/index.css';
import CustomNode from "@/components/main/node_editor/CustomNode.tsx";
import FloatingEdge from "@/components/main/node_editor/FloatingEdge.tsx";
import SmallInfoContextMenu, { type ContextMenuData } from "@/components/main/compare_mode/InfoContextMenuSmall.tsx";

type Props = {
    id: string;
    nodes: Node<NodeData>[];
    edges: Edge<EdgeData>[];
};

type MenuState = {
    position: { x: number; y: number };
    content: ContextMenuData;
} | null;

const nodeTypes = {
    custom: CustomNode,
};

const edgeTypes = {
    floating: FloatingEdge,
};

const fitViewOptions: FitViewOptions = {
    padding: 0.25,
    includeHiddenNodes: false,
    minZoom: 0.1,
    maxZoom: 1,
};

const SmallNodeViewer = ({ nodes, edges, id }: Props) => {
    const { theme } = useTheme();
    const [menu, setMenu] = useState<MenuState>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState<{ x: number; y: number } | null>(null);

    const handleOpenMenu = (event: React.MouseEvent, content: ContextMenuData) => {
        event.preventDefault();
        setMenu({
            position: { x: event.clientX, y: event.clientY },
            content,
        });
    };

    const handleCloseMenu = () => {
        setMenu(null);
        setAdjustedPos(null);
    };

    // Calculate clamped coordinates before paint
    useLayoutEffect(() => {
        if (!menu || !menuRef.current) return;

        const { clientWidth: menuWidth, clientHeight: menuHeight } = menuRef.current;
        const padding = 16;

        let x = menu.position.x;
        let y = menu.position.y;

        if (y + menuHeight + padding > window.innerHeight) {
            y = window.innerHeight - menuHeight - padding;
        }

        if (x + menuWidth + padding > window.innerWidth) {
            x = window.innerWidth - menuWidth - padding;
        }

        x = Math.max(padding, x);
        y = Math.max(padding, y);

        setAdjustedPos({ x, y });
    }, [menu]);

    return (
        <div className="relative h-full w-full min-h-0">
            <ReactFlowProvider>
                <ReactFlow<Node<NodeData>, Edge<EdgeData>>
                    id={id}
                    className="text-secondary-foreground small-node-viewer"
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes as EdgeTypes}
                    fitView
                    fitViewOptions={fitViewOptions}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    nodesFocusable={false}
                    edgesFocusable={false}
                    elementsSelectable={false}
                    zoomOnDoubleClick={false}
                    onPaneClick={handleCloseMenu}
                    onNodeContextMenu={(e, node) => handleOpenMenu(e, { type: "node", data: node.data })}
                    onEdgeContextMenu={(e, edge) => handleOpenMenu(e, { type: "edge", data: edge.data as EdgeData })}
                    onNodeDoubleClick={(e, node) => handleOpenMenu(e, { type: "node", data: node.data })}
                    onEdgeDoubleClick={(e, edge) => handleOpenMenu(e, { type: "edge", data: edge.data as EdgeData })}
                    minZoom={0.05}
                    maxZoom={3}
                >
                    <Controls showFitView showInteractive={false} showZoom={false} />
                    <Background bgColor={theme === "dark" ? "#161C1D" : "#E3E3E3"} />
                </ReactFlow>

                {menu && (
                    <div
                        ref={menuRef}
                        className="fixed z-50 pointer-events-auto"
                        style={{
                            top: adjustedPos ? adjustedPos.y : menu.position.y,
                            left: adjustedPos ? adjustedPos.x : menu.position.x,
                            // Hide briefly during layout calculation to avoid jump flicker
                            visibility: adjustedPos ? "visible" : "hidden",
                        }}
                    >
                        <SmallInfoContextMenu closeMenu={() => setMenu(null)}
                                              menu={menu.content} />
                    </div>
                )}
            </ReactFlowProvider>
        </div>
    );
};

export default SmallNodeViewer;