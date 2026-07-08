import {useCallback, useEffect, useRef, useState} from 'react';
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
import ContextMenu from "@/components/main/node_editor/NodeRightClickMenu.tsx";


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

export type MenuType = {
    id: string;
    top: number | undefined;
    left: number | undefined;
    right: number | undefined;
    bottom: number | undefined;
    openProperties: () => void;
}

const NodeEditor = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const ref = useRef<HTMLDivElement>(null);
    const [menu, setMenu] = useState<MenuType | null>(null);

    const {theme} = useTheme()

    useEffect(() => {
        console.log("EDGES: " + edges)
        console.log("NODES: " + nodes)
        setNodes(nodes)
    }, [edges]);

    const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);


    //Remove watermark
    useEffect(() => {
        const toDelete = document.querySelector('[data-message="Please only hide this attribution when you are subscribed to React Flow Pro: https://reactflow.dev/attribution"]');
        toDelete?.remove()
    }, []);

    const {getEdges, screenToFlowPosition} = useReactFlow();

    //Checl if 2 nodes already have the connection
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

    //Double click handler on node
    const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node as Node<NodeData>);
        setSheetOpen(true);
    }, []);


    //Double click handler on background
    const onPaneClick = useCallback(
        (event: React.MouseEvent | React.TouchEvent) => {
            setMenu(null);

            if ('detail' in event && event.detail === 2) {

                const mouseEvent = event as React.MouseEvent;

                const position = screenToFlowPosition({
                    x: mouseEvent.clientX,
                    y: mouseEvent.clientY,
                });

                const newNode: Node<NodeData> = {
                    id: `node_${Date.now()}`,
                    type: 'custom',
                    position,
                    data: {
                        label: `Node ${nodes.length + 1}`,
                    },
                };

                setNodes((nds) => nds.concat(newNode));
            }
        },
        [screenToFlowPosition, nodes.length, setNodes]
    );

    const updateNodeData = useCallback((id: string, patch: Record<string, any>) => {
        setNodes((nds) =>
            nds.map((n) => (n.id === id ? {...n, data: {...n.data, ...patch}} : n))
        );
        setSelectedNode((prev) => (prev && prev.id === id ? {...prev, data: {...prev.data, ...patch}} : prev));
    }, [setNodes]);


    //Right click handler
    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault();

            if (!ref || !ref.current) return;
            console.log("There is ref")

            setMenu({
                id: node.id,
                top: event.clientY,
                left: event.clientX,
                right: undefined,
                bottom: undefined,
                openProperties: () => {
                    setSelectedNode(node as Node<NodeData>);
                    setSheetOpen(true);
                }
            });
        },
        [setMenu],
    );

    return (
        <>
            <ReactFlow
                ref={ref}
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
                onPaneClick={onPaneClick}
                onNodeContextMenu={onNodeContextMenu}
            >
                {theme === 'dark' ? (
                    <Background bgColor="#161C1D"/>
                ) : (
                    <Background bgColor="#E3E3E3"/>
                )}
            </ReactFlow>
            {menu && <ContextMenu onClick={onPaneClick} {...menu} />}
            <NodePropertiesSheet sheetOpen={sheetOpen} setSheetOpen={setSheetOpen} selectedNode={selectedNode}
                                 updateNodeData={updateNodeData}/>
        </>
    )
        ;
};

export default () => (
    <ReactFlowProvider>
        <NodeEditor/>
    </ReactFlowProvider>
);
