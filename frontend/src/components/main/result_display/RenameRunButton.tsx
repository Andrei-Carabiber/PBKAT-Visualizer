import {useEffect, useState} from "react";
import {Pencil} from "lucide-react";
import {toast} from "sonner";

import {
    type HistoryItem,
    useRunEngine,
} from "@/store/runEngine.ts";

import {Button} from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {Input} from "@/components/ui/input.tsx";

interface RenameRunButtonProps {
    /**
     * Pass an item when rendering the button in the history dialog.
     * If omitted, the currently displayed active job is used.
     */
    item?: HistoryItem;

    /**
     * Show only a pencil icon. Useful inside history rows.
     */
    compact?: boolean;
}

const RenameRunButton = ({
                             item,
                             compact = false,
                         }: RenameRunButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    const {
        activeJob,
        runHistory,
        renameRunHistory,
    } = useRunEngine();

    const resolvedItem =
        item ??
        runHistory.find(
            (historyItem) =>
                historyItem.jobId === activeJob?.jobId
        );

    useEffect(() => {
        if (!isOpen || !resolvedItem) return;

        setName(
            resolvedItem.name === "Untitled"
                ? ""
                : resolvedItem.name
        );
    }, [isOpen, resolvedItem]);

    if (!resolvedItem) {
        return null;
    }

    const handleRename = () => {
        setError("");

        const trimmedName = name.trim();

        if (!trimmedName) {
            setError("Please provide a name.");
            return;
        }

        renameRunHistory(
            resolvedItem.id,
            trimmedName
        );

        toast.success(`Run renamed to "${trimmedName}"`);

        setName("");
        setError("");
        setIsOpen(false);
    };

    const currentlyUntitled =
        resolvedItem.name === "Untitled";

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open);

                if (!open) {
                    setError("");
                    setName("");
                }
            }}
        >
            <DialogTrigger asChild>
                {compact ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        title={
                            currentlyUntitled
                                ? "Name run"
                                : "Rename run"
                        }
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        {currentlyUntitled
                            ? "Name run"
                            : "Rename"}
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent
                className="w-full max-w-md p-6"
                onClick={(event) =>
                    event.stopPropagation()
                }
                onKeyDown={(event) => {
                    if (event.key !== "Enter") return;

                    event.preventDefault();
                    handleRename();
                }}
            >
                <DialogHeader>
                    <DialogTitle>
                        {currentlyUntitled
                            ? "Name this run"
                            : "Rename run"}
                    </DialogTitle>

                    <DialogDescription>
                        Give this run a descriptive name so it
                        is easier to find later.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    <Input
                        placeholder="Run name..."
                        value={name}
                        onChange={(event) => {
                            setName(event.target.value);

                            if (error) {
                                setError("");
                            }
                        }}
                        autoFocus
                    />

                    {error && (
                        <p className="text-xs text-destructive">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() =>
                                setIsOpen(false)
                            }
                        >
                            Cancel
                        </Button>

                        <Button onClick={handleRename}>
                            {currentlyUntitled
                                ? "Save name"
                                : "Rename"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default RenameRunButton;