import {getBezierPath} from '@xyflow/react';

// @ts-ignore
function CustomConnectionLine({ fromX, fromY, toX, toY, connectionLineStyle }) {
    const [edgePath] = getBezierPath({
        sourceX: fromX,
        sourceY: fromY,
        targetX: toX,
        targetY: toY,
    });

    return (
        <g>
            <path style={connectionLineStyle} fill="none" d={edgePath} />
        </g>
    );
}

export default CustomConnectionLine;
