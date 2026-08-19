import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { type HistoryItem, useRunEngine } from "@/store/runEngine";
import { toast } from "sonner";

const SaveToHistoryButton = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const { lastSettingsRan } = useRunEngine();

    const handleSave = () => {
        setError("");

        if (!lastSettingsRan) {
            setError("No run settings found to save.");
            return;
        }

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Please provide a name.");
            return;
        }

        try {
            const rawHistory = localStorage.getItem("history");
            const historyArray: HistoryItem[] = rawHistory ? JSON.parse(rawHistory) : [];

            // Match by unique ID
            const itemIndex = historyArray.findIndex((item) => item.id === lastSettingsRan.id);

            const updatedItem: HistoryItem = {
                id: lastSettingsRan.id,
                name: trimmedName,
                settings: lastSettingsRan,
                savedAt: new Date().toISOString(),
            };

            if (itemIndex === -1) {
                historyArray.push(updatedItem);
            } else {
                historyArray[itemIndex] = updatedItem;
            }

            localStorage.setItem("history", JSON.stringify(historyArray));
            toast.success(`Saved "${trimmedName}" to history`);

            setName("");
            setIsOpen(false);
        } catch {
            setError("Failed to save history to storage.");
        }
    };

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
                <Button className="h-4/5 px-2 py-1.5 rounded-sm">Save to history with name</Button>
            </DialogTrigger>

            <DialogContent className="w-full max-w-md p-6">
                <DialogHeader>
                    <DialogTitle>Save to history</DialogTitle>
                    <DialogDescription>
                        Enter a label for this configuration to find it later.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    <Input
                        placeholder="Configuration name..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSave()}
                        autoFocus
                    />

                    {error && <p className="text-xs text-red-500">{error}</p>}

                    <div className="flex justify-end gap-2">
                        <Button
                            className="rounded-sm"
                            variant="outline"
                            onClick={() => {
                                setIsOpen(false);
                                setName("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button className="rounded-sm" onClick={handleSave}>
                            Save
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SaveToHistoryButton;