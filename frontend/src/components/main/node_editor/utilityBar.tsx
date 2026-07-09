import {
    Plus,
    Undo2,
    Redo2,
    ZoomIn,
    ZoomOut,
    Maximize2,
    LayoutGrid,
    Trash2,
    MoreHorizontal,
} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip.tsx";

type Props = {
    panelSize: number;
    // Wire these up to your node-editor state as needed — left as no-ops for now
    // so the bar drops in without other changes.
    onAddNode?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onFitView?: () => void;
    onAutoLayout?: () => void;
    onDeleteSelected?: () => void;
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
                        onAddNode,
                        onUndo,
                        onRedo,
                        onZoomIn,
                        onZoomOut,
                        onFitView,
                        onAutoLayout,
                        onDeleteSelected,
                    }: Props) => {
    // Swap layouts gracefully if the panel width drops below the icon-only threshold
    const isCollapsed = panelSize < 700;

    const historyActions: Action[] = [
        {key: "undo", label: "Undo", icon: Undo2, onClick: onUndo},
        {key: "redo", label: "Redo", icon: Redo2, onClick: onRedo},
    ];

    const viewActions: Action[] = [
        {key: "zoom-in", label: "Zoom in", icon: ZoomIn, onClick: onZoomIn},
        {key: "zoom-out", label: "Zoom out", icon: ZoomOut, onClick: onZoomOut},
        {key: "fit-view", label: "Fit view", icon: Maximize2, onClick: onFitView},
    ];

    const layoutActions: Action[] = [
        {key: "auto-layout", label: "Auto layout", icon: LayoutGrid, onClick: onAutoLayout},
    ];

    const dangerActions: Action[] = [
        {key: "delete", label: "Delete selected", icon: Trash2, onClick: onDeleteSelected, variant: "destructive"},
    ];

    const overflowGroups: {label: string; actions: Action[]}[] = [
        {label: "History", actions: historyActions},
        {label: "View", actions: viewActions},
        {label: "Layout", actions: layoutActions},
        {label: "Danger zone", actions: dangerActions},
    ];

    const IconButton = ({action}: {action: Action}) => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={action.onClick}
                    className={
                        action.variant === "destructive"
                            ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    }
                >
                    <action.icon className="size-4"/>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{action.label}</TooltipContent>
        </Tooltip>
    );

    if (isCollapsed) {
        return (
            <TooltipProvider delayDuration={200}>
                <div
                    className="w-full h-full flex flex-row items-center
                justify-between gap-2 px-2 py-2 text-card-foreground bg-background rounded-lg border shadow-sm">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                onClick={onAddNode}
                                className="shrink-0 shadow-sm"
                            >
                                <Plus className="size-4"/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Add node</TooltipContent>
                    </Tooltip>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground">
                                <MoreHorizontal className="size-4"/>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-56 flex flex-col gap-3 p-3 shadow-lg">
                            {overflowGroups.map((group, i) => (
                                <div key={group.label} className="flex flex-col gap-1">
                                    {i > 0 && <Separator className="mb-2"/>}
                                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-1">
                                    {group.label}
                                </span>
                                    {group.actions.map((action) => (
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
                                    ))}
                                </div>
                            ))}
                        </PopoverContent>
                    </Popover>
                </div>
            </TooltipProvider>
        );
    }

    // Standard expanded view
    return (
        <TooltipProvider delayDuration={200}>
            <div
                className="w-full h-full flex flex-row items-center
            gap-1 px-2 py-2 text-card-foreground bg-background rounded-lg border shadow-sm overflow-x-auto">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={onAddNode} className="gap-2 shrink-0 shadow-sm">
                            <Plus className="size-4"/>
                            Add node
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Add a new node to the canvas</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-1"/>

                <div className="flex items-center gap-0.5">
                    {historyActions.map((action) => (
                        <IconButton key={action.key} action={action}/>
                    ))}
                </div>

                <Separator orientation="vertical" className="h-6 mx-1"/>

                <div className="flex items-center gap-0.5">
                    {viewActions.map((action) => (
                        <IconButton key={action.key} action={action}/>
                    ))}
                </div>

                <Separator orientation="vertical" className="h-6 mx-1"/>

                <div className="flex items-center gap-0.5">
                    {layoutActions.map((action) => (
                        <IconButton key={action.key} action={action}/>
                    ))}
                </div>

                <div className="flex-1"/>

                <div className="flex items-center gap-0.5">
                    {dangerActions.map((action) => (
                        <IconButton key={action.key} action={action}/>
                    ))}
                </div>
            </div>
        </TooltipProvider>
    );
};

export default UtilityBar;