import { type ConnectionLineComponentProps, getBezierPath } from '@xyflow/react';
import type { CSSProperties } from "react";

// Use ConnectionLineComponentProps directly to get correct XYFlow typing
type CustomConnectionLineProps = ConnectionLineComponentProps & {
    connectionLineStyle?: CSSProperties;
};

function CustomConnectionLine({
                                  fromX,
                                  fromY,
                                  toX,
                                  toY,
                                  connectionLineStyle
                              }: CustomConnectionLineProps) {
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

export default CustomConnectionLine;