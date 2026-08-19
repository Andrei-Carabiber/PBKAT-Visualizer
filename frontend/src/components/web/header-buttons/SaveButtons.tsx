import {Button} from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {Input} from "@/components/ui/input.tsx";
import {useEffect, useRef, useState} from "react";
import {type ActiveConnection, type HistoryItem, useRunEngine} from "@/store/runEngine.ts";
import type {Edge, Node} from "@xyflow/react";
import type {EdgeData, NodeData} from "@/components/main/node_editor/nodeEditor.tsx";
import {toast} from "sonner";
import type {exampleQuantumSave, exampleSave} from "@/examples/type.ts";
import ExampleSelectionCard from "@/components/web/header-buttons/example-selection-card.tsx";
import HistoryDialog from "@/components/web/header-buttons/HistoryDialog.tsx";
import {Menu} from "lucide-react";

const exampleProbModules = import.meta.glob<{ default: exampleSave }>(
    "@/examples/probabilistic/*.json",
    {eager: true}
);
const exampleQuantumModules = import.meta.glob<{
    default: exampleQuantumSave;
}>("@/examples/quantum/*.json", {eager: true});

const exampleProbSaves: exampleSave[] = Object.values(exampleProbModules).map(
    (mod) => mod.default
);
const exampleQuantumSaves: exampleQuantumSave[] = Object.values(exampleQuantumModules).map(
    (mod) => mod.default
);

export type localStorageSave = {
    id: string;
    name: string;
    savedDate: number;
    code: string;
    graph: {
        nodes: Node<NodeData>[];
        edges: Edge<EdgeData>[];
    };
    goal: ActiveConnection[];
    goalDisabled: boolean;
    networkCapacity: ActiveConnection[];
    capacityDisabled: boolean;
};

const SaveButtons = () => {
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string>("");
    const {
        goalConnections,
        networkGoalDisabled,
        setNetworkGoalDisabled,
        networkCapacityDisabled,
        setNetworkCapacityDisabled,
        networkCapacityConnections,
        getUserCodeCallback,
        getGraphCallback,
        setGoalConnections,
        setNetworkCapacityConnections,
        setUserCodeCallback,
        setGraphCallback,
        setTruncation,
        setCoverage,
    } = useRunEngine();

    const [allSaves, setAllSaves] = useState<localStorageSave[]>([]);
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [isExamplesOpen, setIsExamplesOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

    const handleSave = () => {
        const savedName = nameInputRef.current?.value;
        const alreadyPresentNames = allSaves.map((save) => save.name);

        if (!savedName || savedName.trim() === "") {
            setError("Please enter a valid name");
            return;
        }

        if (alreadyPresentNames.includes(savedName)) {
            setError("Save with this name already exists");
            return;
        }

        if (!getUserCodeCallback || !getGraphCallback) {
            setError("Could not save. Please wait a few seconds and try again");
            return;
        }

        setError("");
        const userCode = getUserCodeCallback();
        const graph = getGraphCallback();
        const save: localStorageSave = {
            id: crypto.randomUUID(),
            name: savedName,
            savedDate: Date.now(),
            code: userCode,
            graph,
            goal: goalConnections,
            goalDisabled: networkGoalDisabled,
            networkCapacity: networkCapacityConnections,
            capacityDisabled: networkCapacityDisabled,
        };

        let saves: localStorageSave[] = [];
        const memory = localStorage.getItem("savedStates");
        if (memory) {
            saves = JSON.parse(memory);
        }

        saves.push(save);
        localStorage.setItem("savedStates", JSON.stringify(saves));

        setAllSaves(saves);
        setIsSaveOpen(false);
    };

    const loadAllSaves = () => {
        let allSavesList: localStorageSave[] = [];
        const memory = localStorage.getItem("savedStates");
        if (memory) {
            allSavesList = JSON.parse(memory);
        }
        return allSavesList;
    };

    useEffect(() => {
        setAllSaves(loadAllSaves());
    }, []);

    const handleLoad = (save: localStorageSave | exampleSave | exampleQuantumSave) => {
        try {
            setGoalConnections(save.goal);
            setNetworkCapacityConnections(save.networkCapacity);
            setNetworkCapacityDisabled(save.capacityDisabled);
            setNetworkGoalDisabled(save.goalDisabled);

            if (setGraphCallback && setUserCodeCallback) {
                setGraphCallback(save.graph.nodes, save.graph.edges);

                setTimeout(() => {
                    setUserCodeCallback(save.code);
                }, 0);
            }

            setIsExamplesOpen(false);
            setIsHistoryOpen(false);

            if ("truncation" in save && "coverage" in save) {
                setTruncation(save.truncation);
                setCoverage(save.coverage);
            }
        } catch (err) {
            console.error("There was an error loading the save: ", err);
            setError("Failed to parse or load data correctly.");
        }
    };

    const handleLoadHistory = (item: HistoryItem) => {
        handleLoad({
            id: item.id,
            name: item.name,
            savedDate: item.settings.dateWhenRan,
            code: item.settings.code,
            graph: item.settings.graph,
            goal: item.settings.goal,
            goalDisabled: item.settings.goalDisabled,
            networkCapacity: item.settings.networkCapacity,
            capacityDisabled: item.settings.capacityDisabled,
        });
    };

    const handleShare = async () => {
        if (!getUserCodeCallback || !getGraphCallback) {
            toast.error("Editor is not loaded yet. Try again later.");
            return;
        }

        const shareState = {
            code: getUserCodeCallback(),
            graph: getGraphCallback(),
            goal: goalConnections,
            goalDisabled: networkGoalDisabled,
            networkCapacity: networkCapacityConnections,
            capacityDisabled: networkCapacityDisabled,
        };

        try {
            const response = await fetch("/api/share", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(shareState),
            });

            if (!response.ok) {
                throw new Error("Failed to generate share link");
            }

            const data = await response.json();
            const shareableUrl = `${window.location.origin}/load/${data.id}`;

            await navigator.clipboard.writeText(shareableUrl);
            toast("Link has been copied to clipboard");
        } catch (err) {
            console.error("Share error:", err);
            toast.error("Could not generate share link. Try again later.");
        }
    };

    const runMobileAction = (action: () => void) => {
        setIsMobileSheetOpen(false);
        setTimeout(action, 100);
    };

    return (
        <>
            {/* DESKTOP VIEW */}
            <div className="hidden md:flex gap-4 text-center">
                <Button
                    variant="outline"
                    onClick={() => setIsSaveOpen(true)}
                    className="p-5 border-2 dark:hover:bg-muted"
                >
                    Save
                </Button>
                <Button
                    variant="outline"
                    onClick={() => setIsHistoryOpen(true)}
                    className="p-5 border-2 dark:hover:bg-muted"
                >
                    History and Saves
                </Button>
                <Button
                    onClick={handleShare}
                    variant="outline"
                    className="p-5 border-2 dark:hover:bg-muted"
                >
                    Share
                </Button>
                <Button
                    variant="outline"
                    onClick={() => setIsExamplesOpen(true)}
                    className="p-5 border-2 dark:hover:bg-muted"
                >
                    Examples
                </Button>
            </div>

            {/* MOBILE VIEW (Sheet Menu Trigger) */}
            <div className="flex md:hidden">
                <Dialog open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Menu className="h-5 w-5"/>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-t-xl pb-10 max-w-100">
                        <DialogHeader className="text-left mb-2">
                            <DialogTitle className="text-lg">Menu</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col gap-3">
                            <Button
                                variant="outline"
                                className="w-full border-2 justify-start py-5 text-base border-secondary-foreground"
                                onClick={() => runMobileAction(() => setIsSaveOpen(true))}
                            >
                                Save State
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full border-2 justify-start py-5 text-base border-secondary-foreground"
                                onClick={() => runMobileAction(() => setIsHistoryOpen(true))}
                            >
                                History and Saves
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full border-2 justify-start py-5 text-base border-secondary-foreground"
                                onClick={() => runMobileAction(() => setIsExamplesOpen(true))}
                            >
                                Examples
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full border-2 justify-start py-5 text-base border-secondary-foreground"
                                onClick={() => runMobileAction(handleShare)}
                            >
                                Share Link
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* SAVE DIALOG */}
            <Dialog
                open={isSaveOpen}
                onOpenChange={(open) => {
                    setIsSaveOpen(open);
                    if (!open) setError("");
                }}
            >
                <DialogContent
                    onKeyDown={(e) => {
                        if (e.key !== "Enter") return
                        e.stopPropagation()
                        handleSave()
                    }}
                    showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle className="text-secondary-foreground text-xl">
                            Name your saved state
                        </DialogTitle>
                        <DialogDescription className="pt-4 space-y-4">
                            <Input
                                ref={nameInputRef}
                                placeholder="Enter state name..."
                                className="text-secondary-foreground"
                            />
                            {error && (
                                <p className="text-sm font-medium text-destructive bg-destructive/10 p-2 rounded-md">
                                    {error}
                                </p>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                        <DialogClose asChild>
                            <Button
                                variant="outline"
                                className="px-5 border-secondary-foreground dark:hover:bg-muted"
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            variant="outline"
                            className="px-5 border-secondary-foreground dark:hover:bg-muted"
                            onClick={handleSave}
                        >
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <HistoryDialog
                isOpen={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
                onLoadHistory={handleLoadHistory}
                saves={allSaves}
                onLoadSave={handleLoad}
                setAllSaves={setAllSaves}
            />

            {/* EXAMPLES DIALOG */}
            <Dialog
                open={isExamplesOpen}
                onOpenChange={(open) => {
                    setIsExamplesOpen(open);
                    if (!open) setError("");
                }}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader className="flex flex-col items-center gap-4">
                        <DialogTitle className="text-xl text-left w-full pl-3">
                            Load an Example
                        </DialogTitle>
                        <ExampleSelectionCard
                            probabilisticSaves={exampleProbSaves}
                            quantisticSaves={exampleQuantumSaves}
                            handleLoad={handleLoad}
                        />
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                        <DialogClose asChild>
                            <Button
                                variant="outline"
                                className="text-sm px-10 py-4 border-2 border-secondary-foreground dark:hover:bg-muted"
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default SaveButtons;