// settingsDialog.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ArrowLeft, ChevronRight, Settings, Sliders } from "lucide-react";
import DefaultValuesContent from "./defaultValuesDialog";

type Props = {
    dialogOpen: boolean;
    setDialogOpen: (open: boolean) => void;
};

type ViewMode = "main" | "default-values";

const SettingsDialog = ({ dialogOpen, setDialogOpen }: Props) => {
    const [currentView, setCurrentView] = useState<ViewMode>("main");

    const handleClose = () => {
        setDialogOpen(false);
        // Reset back to main screen on close so it reopens nicely next time
        setTimeout(() => setCurrentView("main"), 200);
    };

    return (
        <Dialog open={dialogOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="flex flex-row items-center gap-2 space-y-0 border-b pb-3">
                    {currentView !== "main" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setCurrentView("main")}
                        >
                            <ArrowLeft className="size-4" />
                        </Button>
                    )}
                    <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                        <Settings className="size-5" />
                        {currentView === "main" && "Settings"}
                        {currentView === "default-values" && "Default Values"}
                    </DialogTitle>
                </DialogHeader>

                {/* MAIN SETTINGS MENU */}
                {currentView === "main" && (
                    <div className="flex flex-col gap-2 py-2">
                        <Button
                            variant="outline"
                            className="w-full justify-between h-12 text-left font-normal"
                            onClick={() => setCurrentView("default-values")}
                        >
                            <div className="flex items-center gap-2">
                                <Sliders className="size-4 text-muted-foreground" />
                                <span>Default Values (Nodes & Edges)</span>
                            </div>
                            <ChevronRight className="size-4 text-muted-foreground" />
                        </Button>

                        {/* Add future settings buttons here */}
                    </div>
                )}

                {currentView === "default-values" && (
                    <DefaultValuesContent onBack={() => setCurrentView("main")} />
                )}
            </DialogContent>
        </Dialog>
    );
};

export default SettingsDialog;