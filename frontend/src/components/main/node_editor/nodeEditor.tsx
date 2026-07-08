import {useCallback, useEffect, useState} from 'react';
import './index.css';

import {
    Background,
    ReactFlow,
    addEdge,
    useNodesState,
    useEdgesState, useReactFlow, ReactFlowProvider, type Edge, type Node, type Connection, type ConnectionMode,
    type IsValidConnection, type DefaultEdgeOptions, type EdgeTypes
} from '@xyflow/react';


import CustomNode from './CustomNode';
import FloatingEdge from './FloatingEdge';
import CustomConnectionLine from './customConnectionLine.tsx';
import {useTheme} from "@/components/theme-provider.tsx";
import NodePropertiesSheet from "@/components/main/node_editor/NodePropertiesSheet.tsx";


const initialNodes: Node<NodeData>[] = [
    {
        id: '1',
        type: 'custom',
        position: {x: 0, y: 0},
        data: {
            label: "A"
        }

    },
    {
        id: '2',
        type: 'custom',
        position: {x: 250, y: 320},
        data: {
            label: "B"
        }
    },
    {
        id: '3',
        type: 'custom',
        position: {x: 40, y: 300},
        data: {
            label: "C"
        }
    },
    {
        id: '4',
        type: 'custom',
        position: {x: 300, y: 0},
        data: {
            label: "D"
        }
    },
];

const initialEdges: Edge[] = [];

const connectionLineStyle = {
    stroke: '#b1b1b7',
};

const nodeTypes = {
    custom: CustomNode,
};

const edgeTypes = {
    floating: FloatingEdge,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
    type: 'floating',
};

export type NodeData = {
    label: string;
    color?: string;
    notes?: string;
};

const NodeEditor = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const {theme} = useTheme()

    useEffect(() => {
        console.log(edges)
        setNodes(nodes)
    }, [edges]);

    const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);


    //Remove attribution
    useEffect(() => {
        const toDelete = document.querySelector('[data-message="Please only hide this attribution when you are subscribed to React Flow Pro: https://reactflow.dev/attribution"]');
        toDelete?.remove()
    }, []);

    const {getEdges} = useReactFlow();

    const isValidConnection = useCallback(
        (connection: Connection) => {
            if (connection.source === connection.target) return false;

            const edges = getEdges();

            const edgeExists = edges.some(
                (edge) =>
                    (edge.source === connection.source && edge.target === connection.target) ||
                    (edge.source === connection.target && edge.target === connection.source)
            );

            return !edgeExists;
        },
        [getEdges],
    );


    const onConnect = useCallback(
        (params: any) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node as Node<NodeData>);
        setSheetOpen(true);
    }, []);

    const updateNodeData = useCallback((id: string, patch: Record<string, any>) => {
        setNodes((nds) =>
            nds.map((n) => (n.id === id ? {...n, data: {...n.data, ...patch}} : n))
        );
        setSelectedNode((prev) => (prev && prev.id === id ? {...prev, data: {...prev.data, ...patch}} : prev));
    }, [setNodes]);

    return (
        <>
            <ReactFlow
                className="rounded-2xl text-secondary-foreground"
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes as EdgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionLineComponent={CustomConnectionLine}
                connectionLineStyle={connectionLineStyle}
                colorMode={theme}
                isValidConnection={isValidConnection as IsValidConnection}
                connectionMode={'loose' as ConnectionMode}
                onNodeDoubleClick={onNodeDoubleClick}
            >
                {theme === 'dark' ? (
                    <Background bgColor="#161C1D"/>
                ) : (
                    <Background bgColor="#E3E3E3"/>
                )}
            </ReactFlow>
            <NodePropertiesSheet sheetOpen={sheetOpen} setSheetOpen={setSheetOpen} selectedNode={selectedNode} updateNodeData={updateNodeData}/>
        </>
    )
        ;
};

export default () => (
    <ReactFlowProvider>
        <NodeEditor/>
    </ReactFlowProvider>
);
