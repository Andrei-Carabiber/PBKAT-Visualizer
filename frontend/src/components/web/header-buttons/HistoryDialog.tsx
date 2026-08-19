import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { type HistoryItem } from "@/store/runEngine.ts";
import { Trash2, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {useNavigate} from "react-router-dom";
import {useCompareStore} from "@/store/useCompareStore.ts";

interface HistoryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onLoadHistory: (item: HistoryItem) => void;
}

const HistoryDialog = ({
                           isOpen,
                           onOpenChange,
                           onLoadHistory,
                       }: HistoryDialogProps) => {
    const [compareModeOn, setCompareModeOn] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

    const loadHistoryItems = () => {
        try {
            const rawHistory = localStorage.getItem("history");
            return rawHistory ? (JSON.parse(rawHistory) as HistoryItem[]) : [];
        } catch {
            return [];
        }
    };

    useEffect(() => {
        if (isOpen) {
            setHistoryItems(loadHistoryItems());
        } else {
            setSelectedIds([]);
            setCompareModeOn(false);
        }
    }, [isOpen]);

    const handleToggleCompareMode = (checked: boolean) => {
        setCompareModeOn(checked);
        if (!checked) {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((itemId) => itemId !== id);
            }
            if (prev.length >= 2) {
                toast.info("You can only compare 2 saves at a time");
                return prev;
            }
            return [...prev, id];
        });
    };

    const handleDeleteItem = (id: string) => {
        const updated = historyItems.filter((item) => item.id !== id);
        localStorage.setItem("history", JSON.stringify(updated));
        setHistoryItems(updated);
        setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
        toast.success("History entry deleted");
    };

    const handleClearAll = () => {
        localStorage.removeItem("history");
        setHistoryItems([]);
        setSelectedIds([]);
        toast.success("History cleared");
    };

    const handleClearAllUntitled = () => {
        const updated = historyItems.filter((item) => item.name !== "Untitled");
        setHistoryItems(updated);
        setSelectedIds((prev) =>
            prev.filter((id) => updated.some((item) => item.id === id))
        );
        localStorage.setItem("history", JSON.stringify(updated));
        toast.success("Cleared all untitled history entries");
    };

    const navigate = useNavigate();
    const setCompareItems = useCompareStore((state) => state.setCompareItems);

    const handleCompare = () => {
        const [firstId, secondId] = selectedIds;
        const itemA = historyItems.find((item) => item.id === firstId);
        const itemB = historyItems.find((item) => item.id === secondId);

        if (!itemA || !itemB) return;

        setCompareItems(itemA, itemB);
        onOpenChange(false);
        navigate("/compare");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader className="flex flex-col gap-2">
                    <div className="flex items-center justify-between w-full pr-6">
                        <DialogTitle className="text-xl">Run History</DialogTitle>

                        {historyItems.length > 0 && (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearAllUntitled}
                                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                    Clear Untitled
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearAll}
                                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                    Clear All
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <DialogDescription className="text-xs text-muted-foreground text-left">
                            {compareModeOn
                                ? "Select 2 configurations to compare."
                                : "Click any previous run to restore its configuration and code into the editor."}
                        </DialogDescription>

                        {historyItems.length > 1 && (
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium select-none ml-2 shrink-0">
                                <Checkbox
                                    checked={compareModeOn}
                                    onCheckedChange={(checked) => handleToggleCompareMode(Boolean(checked))}
                                />
                                Compare Mode
                            </label>
                        )}
                    </div>
                </DialogHeader>

                <div className="relative w-full mt-2">
                    <ScrollArea type="always" className="h-[60vh] w-full pr-4">
                        <div className="flex flex-col gap-3">
                            {historyItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-10">
                                    No run history found. Run a protocol to record history.
                                </p>
                            ) : (
                                historyItems
                                    .slice()
                                    .reverse()
                                    .map((item) => {
                                        const isSelected = selectedIds.includes(item.id);

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => {
                                                    if (compareModeOn) {
                                                        handleToggleSelect(item.id);
                                                    }
                                                }}
                                                className={`flex items-center justify-between p-3.5 border rounded-lg transition-colors ${
                                                    compareModeOn
                                                        ? "cursor-pointer"
                                                        : "hover:bg-muted/50"
                                                } ${
                                                    isSelected
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    {compareModeOn && (
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => handleToggleSelect(item.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    )}

                                                    <div
                                                        className={`flex flex-col flex-1 text-left mr-3 min-w-0 ${
                                                            !compareModeOn ? "cursor-pointer" : ""
                                                        }`}
                                                        onClick={() => {
                                                            if (!compareModeOn) {
                                                                onLoadHistory(item);
                                                            }
                                                        }}
                                                    >
                            <span className="font-medium text-sm text-foreground truncate">
                              {item.name}
                            </span>
                                                        <span className="text-xs text-muted-foreground">
                              {new Date(item.savedAt).toLocaleString()}
                            </span>
                                                    </div>
                                                </div>

                                                {!compareModeOn && (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => onLoadHistory(item)}
                                                            className="text-xs px-3 h-8"
                                                        >
                                                            Load
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteItem(item.id)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <div className="flex items-center justify-between mt-4">
                    <div>
                        {compareModeOn && (
                            <span className="text-xs text-muted-foreground font-medium">
                {selectedIds.length}/2 selected
              </span>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        {compareModeOn && (
                            <Button
                                disabled={selectedIds.length !== 2}
                                onClick={handleCompare}
                                className="px-4"
                            >
                                <ArrowLeftRight className="mr-1.5 h-4 w-4" />
                                Compare
                            </Button>
                        )}

                        <DialogClose asChild>
                            <Button variant="outline" className="px-6">
                                Close
                            </Button>
                        </DialogClose>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default HistoryDialog;