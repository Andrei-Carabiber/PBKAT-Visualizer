import { Handle, Position, useConnection } from '@xyflow/react';

type props = {
    id: string;
    data: {
        label:string;
    }
}

export default function CustomNode({ id, data } : props) {
    const connection = useConnection();

    const isTarget = connection.inProgress && connection.fromNode.id !== id;

    const label = data.label;

    return (
        <div className="customNode">
            <div
                className="customNodeBody"
            >
                {!connection.inProgress && (
                    <Handle
                        className="customHandle"
                        position={Position.Right}
                        type="source"
                    />
                )}
                {(!connection.inProgress || isTarget) && (
                    <Handle className="customHandle" position={Position.Left} type="target" isConnectableStart={false} />
                )}
                {label}
            </div>
        </div>
    );
}
