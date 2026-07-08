import {type ConnectionLineComponent, getBezierPath} from '@xyflow/react';
import type {CSSProperties} from "react";

type props = {
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    connectionLineStyle: CSSProperties
}

function CustomConnectionLine({fromX, fromY, toX, toY, connectionLineStyle}: props) {
    const [edgePath] = getBezierPath({
        sourceX: fromX,
        sourceY: fromY,
        targetX: toX,
        targetY: toY,
    });

    return (
        <g>
            <path style={connectionLineStyle} fill="none" d={edgePath}/>
        </g>
    );
}

export default CustomConnectionLine as ConnectionLineComponent;
