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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { type HistoryItem } from "@/store/runEngine.ts";
import { Trash2, ArrowLeftRight, Bookmark, History } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { useNavigate } from "react-router-dom";
import { useCompareStore } from "@/store/useCompareStore.ts";
import type { localStorageSave } from "./SaveButtons.tsx";

interface HistoryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onLoadHistory: (item: HistoryItem) => void;
    saves: localStorageSave[];
    onLoadSave: (save: localStorageSave) => void;
    setAllSaves: (saves: localStorageSave[]) => void;
}

const HistoryDialog = ({
                           isOpen,
                           onOpenChange,
                           onLoadHistory,
                           saves,
                           onLoadSave,
                           setAllSaves,
                       }: HistoryDialogProps) => {
    const [activeTab, setActiveTab] = useState<"history" | "saved">("history");
    const [compareModeOn, setCompareModeOn] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

    const onDeleteSave = (saves: localStorageSave[], save: localStorageSave) => {
        const newSaves = saves.filter((s) => s.id !== save.id);
        localStorage.setItem("savedStates", JSON.stringify(newSaves));
        setAllSaves(newSaves);
        toast.success("Saved state deleted");
    };

    const handleClearAllSaves = () => {
        localStorage.removeItem("savedStates");
        setAllSaves([]);
        toast.success("All saved states cleared");
    };

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
            <DialogContent className="sm:max-w-xl">
                <DialogHeader className="flex flex-col gap-2">
                    <DialogTitle className="text-xl">History & Saved Loads</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "history" | "saved")}>
                    <div className="flex items-center justify-between gap-2 border-b pb-2">
                        <TabsList className="grid grid-cols-2 w-64">
                            <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs">
                                <History className="h-3.5 w-3.5"/>
                                Run History ({historyItems.length})
                            </TabsTrigger>
                            <TabsTrigger value="saved" className="flex items-center gap-1.5 text-xs">
                                <Bookmark className="h-3.5 w-3.5"/>
                                Saved ({saves.length})
                            </TabsTrigger>
                        </TabsList>

                        {/* RUN HISTORY ACTIONS */}
                        {activeTab === "history" && historyItems.length > 0 && (
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

                        {/* SAVED STATES ACTIONS */}
                        {activeTab === "saved" && saves.length > 0 && (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearAllSaves}
                                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                    Clear All
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* RUN HISTORY TAB */}
                    <TabsContent value="history" className="mt-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <DialogDescription className="text-xs text-muted-foreground text-left">
                                {compareModeOn
                                    ? "Select 2 configurations to compare."
                                    : "Restore previous runs directly into your editor."}
                            </DialogDescription>

                            {historyItems.length > 1 && (
                                <label
                                    className="flex items-center gap-2 cursor-pointer text-xs font-medium select-none ml-2 shrink-0">
                                    <Checkbox
                                        checked={compareModeOn}
                                        onCheckedChange={(checked) =>
                                            handleToggleCompareMode(Boolean(checked))
                                        }
                                    />
                                    Compare Mode
                                </label>
                            )}
                        </div>

                        <ScrollArea type="always" className="h-[50vh] w-full pr-4">
                            <div className="flex flex-col gap-2.5">
                                {historyItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-12">
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
                                                        if (compareModeOn) handleToggleSelect(item.id);
                                                    }}
                                                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                                        compareModeOn ? "cursor-pointer" : "hover:bg-muted/50"
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
                                                        <div className="flex flex-col flex-1 text-left min-w-0">
                                                            <span
                                                                className="font-medium text-sm text-foreground truncate">
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
                                                                <Trash2 className="h-4 w-4"/>
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* SAVED STATES TAB */}
                    <TabsContent value="saved" className="mt-3 space-y-3">
                        <DialogDescription className="text-xs text-muted-foreground text-left">
                            Load or delete states manually saved to browser storage.
                        </DialogDescription>

                        <ScrollArea type="always" className="h-[50vh] w-full pr-4">
                            <div className="flex flex-col gap-2.5">
                                {saves.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-12">
                                        No saved states found. Click "Save" in the header to store one.
                                    </p>
                                ) : (
                                    saves
                                        .slice()
                                        .reverse()
                                        .map((save) => (
                                            <div
                                                key={save.id}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors border-border"
                                            >
                                                <div className="flex flex-col flex-1 text-left min-w-0 pr-3">
                                                    <span className="font-medium text-sm text-foreground truncate">
                                                        {save.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(save.savedDate).toLocaleString()}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => onLoadSave(save)}
                                                        className="text-xs px-3 h-8"
                                                    >
                                                        Load
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onDeleteSave(saves, save)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                <div className="flex items-center justify-between mt-4">
                    <div>
                        {activeTab === "history" && compareModeOn && (
                            <span className="text-xs text-muted-foreground font-medium">
                                {selectedIds.length}/2 selected
                            </span>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        {activeTab === "history" && compareModeOn && (
                            <Button
                                disabled={selectedIds.length !== 2}
                                onClick={handleCompare}
                                className="px-4"
                            >
                                <ArrowLeftRight className="mr-1.5 h-4 w-4"/>
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