import {
    Background,
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

type Props = {
    id: string;
    nodes: Node<NodeData>[];
    edges: Edge<EdgeData>[];
};

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

    console.log(edges)
    return (
        <div className="h-full w-full min-h-0">
            <ReactFlowProvider>
                <ReactFlow<Node<NodeData>, Edge<EdgeData>>
                    id={id}
                    className="text-secondary-foreground"
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
                    minZoom={0.05}
                    maxZoom={3}
                >
                    <Background bgColor={theme === "dark" ? "#161C1D" : "#E3E3E3"} />
                </ReactFlow>
            </ReactFlowProvider>
        </div>
    );
};

export default SmallNodeViewer;