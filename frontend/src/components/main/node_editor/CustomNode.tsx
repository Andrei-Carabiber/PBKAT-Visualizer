import { Handle, Position, useConnection } from '@xyflow/react';

type props = {
    id: string;
    data: {
        nodeLabel: string;
    }
}

export default function CustomNode({ id, data }: props) {
    const connection = useConnection();
    const isTarget = connection.inProgress && connection.fromNode.id !== id;
    const label = data.nodeLabel;

    return (
        <div className="customNode">
            {!connection.inProgress && (
                <>
                    <Handle className="customHandle handleBand handleBand-top" id="top" position={Position.Top} type="source" />
                    <Handle className="customHandle handleBand handleBand-right" id="right" position={Position.Right} type="source" />
                    <Handle className="customHandle handleBand handleBand-bottom" id="bottom" position={Position.Bottom} type="source" />
                    <Handle className="customHandle handleBand handleBand-left" id="left" position={Position.Left} type="source" />
                </>
            )}
            {isTarget && (
                <Handle
                    className="customHandle handleFull"
                    position={Position.Top}
                    type="target"
                    isConnectableStart={false}
                />
            )}

            <div className="customNodeBody items-center flex justify-around">
                <div className="custom-drag-handle flex items-center justify-around text-base">
                    {label}
                </div>
            </div>
        </div>
    );
}