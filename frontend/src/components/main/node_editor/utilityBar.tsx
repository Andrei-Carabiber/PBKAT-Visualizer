import {
    Plus,
    Undo2,
    Redo2,
    Maximize2,
    Trash2,
    MoreHorizontal, BrainIcon,
} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {type Node, useReactFlow} from "@xyflow/react";
import type {NodeData} from "@/components/main/node_editor/nodeEditor.tsx";

type Props = {
    panelSize: number;
    onUndo?: () => void;
    onRedo?: () => void;
};

type Action = {
    key: string;
    label: string;
    icon: typeof Plus;
    onClick?: () => void;
    variant?: "default" | "ghost" | "destructive";
};

const UtilityBar = ({
                        panelSize,
                        onUndo,
                        onRedo,
                    }: Props) => {


    const {fitView, getNodes, setNodes, setEdges, screenToFlowPosition} = useReactFlow<Node<NodeData>>();

    const deleteAll = () => {
        setNodes([])
        setEdges([])
    }

    const addBasicNode = () => {

        const flowContainer = document.querySelector('.react-flow');

        if (!flowContainer) return;

        const rect = flowContainer.getBoundingClientRect();

        const centerX = rect.left + rect.width / 2 - 100;
        const centerY = rect.top + rect.height / 2 - 100 ;

        const projectCenter = screenToFlowPosition({
            x: centerX,
            y: centerY,
        });

        const nodes = getNodes()

        const newNode: Node<NodeData> = {
            id: `node_${Date.now()}`,
            type: 'custom',
            position: projectCenter,
            data: {
                label: `Node ${nodes.length + 1}`,
            },
        };

        setNodes((nds) => nds.concat(newNode));

    }


    const isCollapsed = panelSize < 900;

    const availableActions: Action[] = [
        {key: "undo", label: "Undo", icon: Undo2, onClick: onUndo},
        {key: "redo", label: "Redo", icon: Redo2, onClick: onRedo},
        {key: "fit-view", label: "Fit view", icon: Maximize2, onClick: fitView},
        {
            key: "calculate", label: "Auto-create", icon: BrainIcon, onClick: () => {
            }
        },
        {key: "delete", label: "Delete everything", icon: Trash2, onClick: deleteAll, variant: "destructive"},

    ];


    const IconAndTextButton = ({action}: { action: Action }) => (
        <Button
            variant='outline'
            size="icon"
            onClick={action.onClick}
            className={
                action.variant === "destructive"
                    ? "text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors w-fit p-2"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-fit p-2"
            }
        >
            <action.icon className="size-4"/>
            <p className="pl-1">{action.label}</p>
        </Button>
    );

    if (isCollapsed) {
        return (
            <div
                className="w-full h-full flex flex-row items-center
                justify-between gap-2 px-2 py-4 text-card-foreground bg-background rounded-lg border shadow-sm">
                <Button
                    size="icon"
                    onClick={addBasicNode}
                    className="shrink-0 shadow-sm h-full w-fit px-4 py-1"
                >
                    <Plus className="size-4"/>
                    <p>Add new node</p>
                </Button>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground">
                            <MoreHorizontal className="size-4"/>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-56 flex flex-col gap-3 p-3 shadow-lg">
                        <div>
                            {availableActions.map((action, index) => (
                                <div>
                                    <Button
                                        key={action.key}
                                        variant="ghost"
                                        onClick={action.onClick}
                                        className={
                                            "justify-start gap-2 " +
                                            (action.variant === "destructive"
                                                ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                                                : "")
                                        }
                                    >
                                        <action.icon className="size-4"/>
                                        {action.label}
                                    </Button>
                                    {index !== availableActions.length - 1 && <Separator className="my-1"/>}
                                </div>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        )
            ;
    }

    // Standard expanded view
    return (
        <div
            className="w-full h-full flex flex-row items-center
            gap-1 px-6 py-4 text-card-foreground bg-background rounded-lg border shadow-sm overflow-x-auto">
            <Button
                size="icon"
                onClick={addBasicNode}
                className="shrink-0 shadow-sm h-full w-fit px-4 py-1"
            >
                <Plus className="size-4"/>
                <p>Add new node</p>
            </Button>

            <Separator orientation="vertical" className="h-6 mx-4"/>

            <div className="flex items-center justify-between w-full">
                {availableActions.map((action) => (
                    <IconAndTextButton key={action.key} action={action}/>
                ))}
            </div>
        </div>
    );
};

export default UtilityBar;