import { useState, useCallback, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';

type HistoryItem = { nodes: Node[]; edges: Edge[] };

const MAX_HISTORY = 100;

export function useUndoRedo(
    nodes: Node[],
    edges: Edge[],
    setNodes: (nodes: Node[]) => void,
    setEdges: (edges: Edge[]) => void,
) {
    const past = useRef<HistoryItem[]>([]);
    const future = useRef<HistoryItem[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const snapshot = useCallback((): HistoryItem => ({
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
    }), [nodes, edges]);

    // Call this BEFORE you mutate nodes/edges
    const takeSnapshot = useCallback(() => {
        past.current.push(snapshot());
        if (past.current.length > MAX_HISTORY) past.current.shift();
        future.current = [];
        setCanUndo(true);
        setCanRedo(false);
    }, [snapshot]);

    const undo = useCallback(() => {
        const prev = past.current.pop();
        if (!prev) return;
        future.current.push(snapshot());
        setNodes(prev.nodes);
        setEdges(prev.edges);
        setCanUndo(past.current.length > 0);
        setCanRedo(true);
    }, [snapshot, setNodes, setEdges]);

    const redo = useCallback(() => {
        const next = future.current.pop();
        if (!next) return;
        past.current.push(snapshot());
        setNodes(next.nodes);
        setEdges(next.edges);
        setCanRedo(future.current.length > 0);
        setCanUndo(true);
    }, [snapshot, setNodes, setEdges]);

    return { takeSnapshot, undo, redo, canUndo, canRedo };
}