import { Position } from '@xyflow/react';

function getNodeCenter(node: any) {
    const width = node.measured?.width ?? 80;
    const height = node.measured?.height ?? 80;

    const posX = node.internals?.positionAbsolute?.x ?? node.position?.x ?? 0;
    const posY = node.internals?.positionAbsolute?.y ?? node.position?.y ?? 0;

    return {
        x: posX + width / 2,
        y: posY + height / 2,
    };
}


function getEdgePosition(node: any, centerPoint: any) {
    const width = node.measured?.width ?? 80;
    const height = node.measured?.height ?? 80;
    const n = {
        x: node.internals?.positionAbsolute?.x ?? node.position?.x ?? 0,
        y: node.internals?.positionAbsolute?.y ?? node.position?.y ?? 0
    };

    const px = Math.round(centerPoint.x);
    const py = Math.round(centerPoint.y);

    if (px <= n.x + 1) return Position.Left;
    if (px >= n.x + width - 1) return Position.Right;
    if (py <= n.y + 1) return Position.Top;
    if (py >= n.y + height - 1) return Position.Bottom;

    return Position.Top;
}

export function getEdgeParams(source: any, target: any) {
    const sourceCenter = getNodeCenter(source);
    const targetCenter = getNodeCenter(target);

    const sourcePos = getEdgePosition(source, targetCenter);
    const targetPos = getEdgePosition(target, sourceCenter);

    return {
        sx: sourceCenter.x,
        sy: sourceCenter.y,
        tx: targetCenter.x,
        ty: targetCenter.y,
        sourcePos,
        targetPos,
    };
}

export const convertToProbability = (nr: number) => {
    if (nr < 0) return 0;
    else if (nr > 1) return 1;
    else return nr;
};

export const zeroOrGreater = (nr: number) => {
    if (nr < 0) return 0;
    else return nr;
};
