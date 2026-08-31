import { useState } from "react";
import { Reorder } from "framer-motion"
import { useCompareStore } from "@/store/useCompareStore.ts";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.tsx";
import { type HistoryItem, useRunEngine } from "@/store/runEngine.ts";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { toast } from "sonner";

const CompareItemTitles = () => {
    const { items, setItems } = useCompareStore();
    const [renameOpen, setRenameOpen] = useState(false);
    const [selectedRename, setSelectedRename] = useState<HistoryItem | null>(null);
    const [newName, setNewName] = useState("");
    const { renameRunHistory } = useRunEngine();

    const handleReorder = (newOrder: typeof items) => {
        setItems(newOrder);
    };

    const handleRename = () => {
        if (!selectedRename) {
            toast.error("Something went wrong");
            return;
        }

        const updatedItems = items.map((item) =>
            item.id === selectedRename.id
                ? { ...item, name: newName }
                : item
        );

        console.log("BEFORE:", items);
        console.log("AFTER:", updatedItems);

        setItems(updatedItems);
        renameRunHistory(selectedRename.id, newName);

        toast.success("Changed name successfully");
        setRenameOpen(false);
        setNewName("");
        setSelectedRename(null);
    };

    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="shrink-0">Comparing:</span>

            <Reorder.Group
                axis="x"
                values={items}
                onReorder={handleReorder}
                className="flex items-center gap-2 overflow-x-auto py-1 flex-wrap"
            >
                {items.map((item) => (
                    <Reorder.Item
                        key={item.id}
                        value={item}
                        className="cursor-grab active:cursor-grabbing select-none"
                    >
                        <Badge
                            variant="secondary"
                            className="flex items-center gap-1.5 px-2.5 py-1 text-foreground font-semibold shadow-sm hover:bg-secondary/80 rounded-sm"
                            onDoubleClick={() => {
                                setSelectedRename(item);
                                setNewName(item.name);
                                setRenameOpen(true);
                            }}
                        >
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.name}
                        </Badge>
                    </Reorder.Item>
                ))}
            </Reorder.Group>

            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent>
                    <DialogTitle>
                        Rename {selectedRename?.name}
                    </DialogTitle>

                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />

                    <Button onClick={handleRename}>
                        Set New Name
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    );
};
export default CompareItemTitles;