import {useCallback, useEffect} from 'react';
import './index.css';

import {
    Background,
    ReactFlow,
    addEdge,
    useNodesState,
    useEdgesState, useReactFlow, ReactFlowProvider, type Edge, type Node, type Connection, type ConnectionMode,
    type IsValidConnection, type DefaultEdgeOptions, type EdgeTypes,
} from '@xyflow/react';


import CustomNode from './CustomNode';
import FloatingEdge from './FloatingEdge';
import CustomConnectionLine from './customConnectionLine.tsx';
import {useTheme} from "@/components/theme-provider.tsx";

const initialNodes: Node[] = [
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

const NodeEditor = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const {theme} = useTheme()

    useEffect(() => {
        console.log(edges)
        setNodes(nodes)
    }, [edges]);

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

    return (
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
        >
            {theme === 'dark' ? (
                <Background bgColor="#161C1D" />
            ) : (
                <Background bgColor="#E3E3E3" />
            )}
        </ReactFlow>
    );
};

export default () => (
    <ReactFlowProvider>
        <NodeEditor/>
    </ReactFlowProvider>
);
