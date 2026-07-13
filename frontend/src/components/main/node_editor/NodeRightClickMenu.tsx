import {useCallback} from 'react';
import {useReactFlow, type Node} from '@xyflow/react';
import {type NodeData, type MenuType} from './nodeEditor.tsx';
import {Card, CardContent} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";

interface ContextMenuProps extends MenuType {
    onClick: (event: React.MouseEvent) => void;
    takeSnapshot: () => void;
}

export default function ContextMenu({
                                        id,
                                        top,
                                        left,
                                        right,
                                        bottom,
                                        openProperties,
                                        takeSnapshot,
                                        ...props
                                    }: ContextMenuProps) {
    const {getNode, setNodes, addNodes, setEdges} = useReactFlow<Node<NodeData>>();

    const duplicateNode = useCallback(() => {
        const node = getNode(id);
        if (!node) return;
        takeSnapshot();
        addNodes({
            ...node, selected: false, dragging: false, id: `${node.id}-copy`,
            position: {x: node.position.x + 50, y: node.position.y + 50}
        });
    }, [id, getNode, addNodes, takeSnapshot]);

    const deleteNode = useCallback(() => {
        takeSnapshot();
        setNodes((nodes) => nodes.filter((node) => node.id !== id));
        setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
    }, [id, setNodes, setEdges, takeSnapshot]);

    return (
        <Card style={{top, left, position: 'fixed', zIndex: 1000}}
              className="context-menu bg-muted w-fit h-fit shadow-2xl ring-1 px-3"
              {...props}>
            <CardContent className="flex flex-col gap-1 p-1">
                <Button className="w-full"
                        onClick={duplicateNode}
                >
                    Duplicate Node
                </Button>
                <Button className="w-full"
                        onClick={deleteNode}
                >
                    Delete Node
                </Button>
                <Button className="w-full"
                        onClick={openProperties}
                >
                    Properties
                </Button>
            </CardContent>
        </Card>
    );
}