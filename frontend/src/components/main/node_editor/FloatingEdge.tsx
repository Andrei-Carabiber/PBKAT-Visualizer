import {BaseEdge, EdgeLabelRenderer, type EdgeProps, getBezierPath, useInternalNode} from '@xyflow/react';

import {getEdgeParams} from './utils.js';

function FloatingEdge({id, source, target, markerEnd, style}: EdgeProps) {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    if (!sourceNode || !targetNode) {
        return null;
    }

    const {sx, sy, tx, ty} = getEdgeParams(sourceNode, targetNode);

    const [path, labelX, labelY] = getBezierPath({
        sourceX: sx,
        sourceY: sy,
        targetX: tx,
        targetY: ty,
    });

    return (
        <>
            <BaseEdge
                id={id}
                className="react-flow__edge-path"
                path={path}
                markerEnd={markerEnd}
                style={style}
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan bg-background border px-2 py-1 rounded shadow-sm text-xs flex gap-2 items-center"
                >
                    <div className="flex flex-col">
                        <span>{`${sourceNode.data.nodeLabel} ~ ${targetNode.data.nodeLabel}`}</span>
                    </div>
                </div>
            </EdgeLabelRenderer>
        </>

    );
}

export default FloatingEdge;
