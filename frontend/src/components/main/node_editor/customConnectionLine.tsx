import {type ConnectionLineComponentProps, getStraightPath} from '@xyflow/react';
import type {CSSProperties} from "react";

// Use ConnectionLineComponentProps directly to get correct XYFlow typing
type CustomConnectionLineProps = ConnectionLineComponentProps & {
    connectionLineStyle?: CSSProperties;
};

function CustomConnectionLine({
                                  fromNode,
                                  toNode,
                                  toX,
                                  toY,
                                  connectionLineStyle
                              }: CustomConnectionLineProps) {

    const width = fromNode.measured.width ?? 80;
    const height = fromNode.measured.height ?? 80;

    const sourcePosX = fromNode.internals?.positionAbsolute?.x ?? fromNode?.position?.x ?? 0;
    const sourcePosY = fromNode.internals?.positionAbsolute?.y ?? fromNode?.position?.y ?? 0;

    // Calculate absolute center of the source node
    const sourceX = sourcePosX + width / 2;
    const sourceY = sourcePosY + height / 2;

    const toPosX = toNode?.internals.positionAbsolute.x ?? toNode?.position.x
    const toPosY = toNode?.internals.positionAbsolute.y ?? toNode?.position.y

    let finalToX : number | undefined;
    let finalToY : number | undefined;
    if (toPosX && toPosY) {
         finalToX = toPosX + width / 2;
         finalToY = toPosY + width / 2;
    }

    const [edgePath] = getStraightPath({
        sourceX: sourceX,
        sourceY: sourceY,
        targetX: finalToX ?? toX,
        targetY: finalToY ?? toY,
    });

    return (
        <g>
            <path style={connectionLineStyle} fill="none" d={edgePath}/>
        </g>
    );
}

export default CustomConnectionLine;