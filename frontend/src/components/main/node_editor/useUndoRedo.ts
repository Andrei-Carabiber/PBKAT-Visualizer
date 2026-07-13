import {useState, useCallback, useRef} from 'react';
import type {Node, Edge} from '@xyflow/react';

// Use generics here so the history tracks the exact shape of your data
type HistoryItem<TNode extends Node = Node, TEdge extends Edge = Edge> = {
    nodes: TNode[];
    edges: TEdge[];
};

const MAX_HISTORY = 100;

export function useUndoRedo<TNode extends Node = Node, TEdge extends Edge = Edge>(
    nodes: TNode[],
    edges: TEdge[],
    setNodes: (nodes: TNode[]) => void,
    setEdges: (edges: TEdge[]) => void,
) {
    // Pass the generics down to the history refs
    const past = useRef<HistoryItem<TNode, TEdge>[]>([]);
    const future = useRef<HistoryItem<TNode, TEdge>[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const snapshot = useCallback((): HistoryItem<TNode, TEdge> => ({
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
    }), [nodes, edges]);

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

    return {takeSnapshot, undo, redo, canUndo, canRedo};
}