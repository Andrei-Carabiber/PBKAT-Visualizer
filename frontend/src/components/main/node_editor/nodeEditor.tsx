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
import UtilityBar from "@/components/main/node_editor/utilityBar.tsx";
import {useUndoRedo} from "@/components/main/node_editor/useUndoRedo.ts";
import EdgePropertiesSheet from "@/components/main/node_editor/EdgePropertiesSheet.tsx";
import {useRunEngine} from "@/store/runEngine.ts";
import {parseProtocolGraph} from "@/components/main/text_editor/protocolParser.ts";
import * as React from "react";


const initialNodes: Node<NodeData>[] = [
    {
        id: '1',
        type: 'custom',
        position: {x: 100, y: 0},
        data: {
            nodeLabel: "A",
            coherence_time: 1,

        }

    },
    {
        id: '2',
        type: 'custom',
        position: {x: 100, y: 500},
        data: {
            nodeLabel: "B",
            coherence_time: 1,

        }
    },
    {
        id: '3',
        type: 'custom',
        position: {x: 100, y: 250},
        data: {
            nodeLabel: "C",
            coherence_time: 1,

        }
    },
];

const initialEdges: Edge<EdgeData>[] = [
    {
        id: 'A-C',
        source: '1',
        target: '3',
        type: 'floating',
        data: {distance: 50, transmit_prob: 0.85}
    },
    {
        id: 'B-C',
        source: '2',
        target: '3',
        type: 'floating',
        data: {distance: 30, transmit_prob: 0.95}
    },
];

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
    nodeLabel: string;
    coherence_time: number;
    create_prob?: number;
    create_quality?: number
    swap_prob?: number;
};

export type EdgeData = {
    distance: number;
    transmit_prob: number;
    uCreate_prob?: number;
    uCreate_quality?: number;
}

export type MenuType = {
    id: string;
    top: number | undefined;
    left: number | undefined;
    right: number | undefined;
    bottom: number | undefined;
    openProperties: () => void;
}

const NodeEditor = ({panelSize}: { panelSize: number }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<EdgeData>>(initialEdges);
    const ref = useRef<HTMLDivElement>(null);
    const [menu, setMenu] = useState<MenuType | null>(null);

    const {takeSnapshot, undo, redo, canUndo, canRedo} =
        useUndoRedo(nodes, edges, setNodes, setEdges);

    const {theme} = useTheme()

    const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
    const [selectedEdge, setSelectedEdge] = useState<Edge<EdgeData> | null>(null);
    const [nodeSheetOpen, setNodeSheetOpen] = useState(false);
    const [edgeSheetOpen, setEdgeSheetOpen] = useState(false);



    //Remove watermark
    useEffect(() => {
        const toDelete = document.querySelector('[data-message="Please only hide this attribution when you are subscribed to React Flow Pro: https://reactflow.dev/attribution"]');
        toDelete?.remove()
    }, []);

    const {getEdges, screenToFlowPosition} = useReactFlow();

    //Check if 2 nodes already have the connection
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
        (params: Connection) => {
            takeSnapshot();

            const newEdge: Edge<EdgeData> = {
                ...params,
                id: `edge_${Date.now()}`,
                type: 'floating',
                data: {
                    distance: 10,
                    transmit_prob: 1.0,
                }
            };

            setEdges((eds) => addEdge(newEdge, eds));
        },
        [setEdges, takeSnapshot],
    );

    const onNodeDragStart = useCallback(() => {
        takeSnapshot();
    }, [takeSnapshot]);

    //Double click handler on node
    const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node as Node<NodeData>);
        setNodeSheetOpen(true);
    }, []);

    const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
        setSelectedEdge(edge as Edge<EdgeData>);
        setEdgeSheetOpen(true);
    }, [])


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

                takeSnapshot();
                const newNode: Node<NodeData> = {
                    id: `node_${Date.now()}`,
                    type: 'custom',
                    position,
                    data: {
                        nodeLabel: `Node ${nodes.length + 1}`,
                        coherence_time: 1,
                    },
                };
                setNodes((nds) => nds.concat(newNode));
            }
        },
        [screenToFlowPosition, nodes.length, setNodes, takeSnapshot]
    );
    const updateNodeData = useCallback((id: string, patch: Record<string, any>) => {
        setNodes((nds) =>
            nds.map((n) => (n.id === id ? {...n, data: {...n.data, ...patch}} : n)));
        setSelectedNode((prev) => (prev && prev.id === id ? {...prev, data: {...prev.data, ...patch}} : prev));
    }, [setNodes]);

    const updateEdgeData = useCallback((id: string, patch: Partial<EdgeData>) => {
        setEdges((edgs) =>
            edgs.map((e) => (e.id === id ? { ...e, data: { ...e.data, ...patch } as EdgeData } : e))
        );
        setSelectedEdge((prev) => (prev && prev.id === id ? { ...prev, data: { ...prev.data, ...patch } as EdgeData } : prev));
    }, [setEdges]);

    //Right-click handler
    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault();

            if (!ref || !ref.current) return;
            console.log(event.clientY, event.clientX)
            setMenu({
                id: node.id,
                top: event.clientY,
                left: event.clientX,
                right: undefined,
                bottom: undefined,
                openProperties: () => {
                    setSelectedNode(node as Node<NodeData>);
                    setNodeSheetOpen(true);
                }
            });
        },
        [setMenu],
    );


    //Handle undo redo
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            const isMod = e.ctrlKey || e.metaKey;
            if (isMod && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                e.shiftKey ? redo() : undo();
            } else if (isMod && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo]);


    const onBeforeDelete = useCallback(
        async () => {
            takeSnapshot();
            return true; // allow the deletion to proceed
        },
        [takeSnapshot],
    );

    const onNodesDelete = useCallback(
        (_deleted: Node[]) => {
            takeSnapshot();
        },
        [takeSnapshot],
    );

    const onEdgesDelete = useCallback(
        (_deleted: Edge[]) => {
            takeSnapshot();
        },
        [takeSnapshot],
    );

    //Connect to zustand
    const registerGraph = useRunEngine((state) => state.registerGraph)
    useEffect(() => {
        if (registerGraph) {
            registerGraph(() => ({nodes,edges}));
        }
    }, [nodes, edges, registerGraph]);


    //Auto-create button
    const onAutoCreate = useCallback(() => {
        const getUserCode = useRunEngine.getState().getUserCodeCallback;
        const code = getUserCode?.();
        if (!code) return;

        const {nodeLabels, edgePairs} = parseProtocolGraph(code);
        if (nodeLabels.length === 0) return;

        takeSnapshot();

        const existingLabels = new Set(nodes.map((n) => n.data.nodeLabel));
        const labelsToAdd = nodeLabels.filter((label) => !existingLabels.has(label));

        const newNodes: Node<NodeData>[] = labelsToAdd.map((label, i) => ({
            id: `node_${Date.now()}_${i}`,
            type: 'custom',
            position: {
                x: 100 + ((nodes.length + i) % 4) * 200,
                y: 100 + Math.floor((nodes.length + i) / 4) * 200,
            },
            data: {
                nodeLabel: label,
                coherence_time: 1,
            },
        }));

        const allNodes = nodes.concat(newNodes);
        const labelToId = new Map(allNodes.map((n) => [n.data.nodeLabel, n.id]));

        const edgeAlreadyPresent = (aId: string, bId: string, list: Edge<EdgeData>[]) =>
            list.some(
                (e) =>
                    (e.source === aId && e.target === bId) ||
                    (e.source === bId && e.target === aId),
            );

        const newEdges: Edge<EdgeData>[] = [];
        edgePairs.forEach(([a, b]) => {
            const aId = labelToId.get(a);
            const bId = labelToId.get(b);
            if (!aId || !bId || aId === bId) return;
            if (edgeAlreadyPresent(aId, bId, edges) || edgeAlreadyPresent(aId, bId, newEdges)) return;

            newEdges.push({
                id: `edge_${Date.now()}_${a}_${b}`,
                source: aId,
                target: bId,
                type: 'floating',
                data: {
                    distance: 10,
                    transmit_prob: 1.0,
                },
            });
        });

        if (newNodes.length) setNodes(allNodes);
        if (newEdges.length) setEdges(edges.concat(newEdges));
    }, [nodes, edges, setNodes, setEdges, takeSnapshot]);


    return (
        <div className="h-full w-full flex flex-col gap-3 p-4 pt-2 bg-card rounded-lg">
            <div className="shrink-0 h-20">
                <UtilityBar panelSize={panelSize} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
                            takeSnapshot={takeSnapshot} onAutoCreate={onAutoCreate} />
            </div>
            <div className="flex-1 min-h-0 w-full flex relative">
                <div className="flex-1 min-h-0 w-full flex rounded-lg border overflow-hidden">
                    <ReactFlow<Node<NodeData>, Edge<EdgeData>>
                        ref={ref}
                        className="text-secondary-foreground"
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onBeforeDelete={onBeforeDelete}
                        onNodesDelete={onNodesDelete}
                        onEdgesDelete={onEdgesDelete}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes as EdgeTypes}
                        defaultEdgeOptions={defaultEdgeOptions}
                        connectionLineComponent={CustomConnectionLine}
                        connectionLineStyle={connectionLineStyle}
                        colorMode={theme}
                        isValidConnection={isValidConnection as IsValidConnection}
                        connectionMode={'loose' as ConnectionMode}
                        onNodeDoubleClick={onNodeDoubleClick}
                        onEdgeDoubleClick={onEdgeDoubleClick}
                        onPaneClick={onPaneClick}
                        onNodeContextMenu={onNodeContextMenu}
                        zoomOnDoubleClick={false}
                        onNodeDragStart={onNodeDragStart}
                        fitView
                    >
                        {theme === 'dark' ? (
                            <Background bgColor="#161C1D"/>
                        ) : (
                            <Background bgColor="#E3E3E3"/>
                        )}
                    </ReactFlow>
                </div>
                {menu && <ContextMenu onClick={onPaneClick} takeSnapshot={takeSnapshot} {...menu} />}
                <NodePropertiesSheet sheetOpen={nodeSheetOpen} setSheetOpen={setNodeSheetOpen}
                                     selectedNode={selectedNode}
                                     updateNodeData={updateNodeData} takeSnapshot={takeSnapshot}/>
                <EdgePropertiesSheet sheetOpen={edgeSheetOpen} setSheetOpen={setEdgeSheetOpen}
                                     selectedEdge={selectedEdge} updateEdgeData={updateEdgeData} takeSnapshot={takeSnapshot}/>
            </div>
        </div>
    )
        ;
};

export default ({panelSize}: { panelSize: number }) => (
    <ReactFlowProvider>
        <NodeEditor panelSize={panelSize}/>
    </ReactFlowProvider>
);