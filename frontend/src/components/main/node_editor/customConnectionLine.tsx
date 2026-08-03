import { type ConnectionLineComponentProps, getStraightPath } from '@xyflow/react';
import type { CSSProperties } from "react";

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

    const width = fromNode.measured?.width ?? 110;
    const height = fromNode.measured?.height ?? 110;

    const sourcePosX = fromNode.internals?.positionAbsolute?.x ?? fromNode?.position?.x ?? 0;
    const sourcePosY = fromNode.internals?.positionAbsolute?.y ?? fromNode?.position?.y ?? 0;

    const sourceX = sourcePosX + width / 2;
    const sourceY = sourcePosY + height / 2;

    let finalToX = toX;
    let finalToY = toY;

    if (toNode) {
        const toWidth = toNode.measured?.width ?? 110;
        const toHeight = toNode.measured?.height ?? 110;
        const toPosX = toNode.internals?.positionAbsolute?.x ?? toNode?.position?.x ?? 0;
        const toPosY = toNode.internals?.positionAbsolute?.y ?? toNode?.position?.y ?? 0;

        finalToX = toPosX + toWidth / 2;
        finalToY = toPosY + toHeight / 2;
    }

    const [edgePath] = getStraightPath({
        sourceX,
        sourceY,
        targetX: finalToX,
        targetY: finalToY,
    });

    return (
        <g>
            <path style={connectionLineStyle} fill="none" d={edgePath}/>
        </g>
    );
}

export default CustomConnectionLine;