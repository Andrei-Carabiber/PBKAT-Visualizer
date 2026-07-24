import {Button} from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog.tsx"
import {Input} from "@/components/ui/input.tsx";
import {useEffect, useRef, useState} from "react";
import {type ActiveConnection, useRunEngine} from "@/store/runEngine.ts";
import type {Edge, Node} from "@xyflow/react";
import type {EdgeData, NodeData} from "@/components/main/node_editor/nodeEditor.tsx";
import LocalSaveDisplayCard from "@/components/web/header-buttons/local-save-display-card.tsx";
import {toast} from "sonner";
import type {exampleSave} from "@/examples/type.ts";
import ExampleSelectionCard from "@/components/web/header-buttons/example-selection-card.tsx";
import type {ProtocolCommand} from "@/components/main/text_editor/haskellBoilerplate.ts";

const exampleModules = import.meta.glob<{ default: exampleSave }>('@/examples/*.json', {eager: true});

const exampleSaves: exampleSave[] = Object.values(exampleModules).map(
    (mod) => mod.default
);

export type localStorageSave = {
    id: string,
    name: string,
    savedDate: number,
    code: string,
    graph: {
        nodes: Node<NodeData>[],
        edges: Edge<EdgeData>[],
    },
    goal: ActiveConnection[],
    goalDisabled: boolean,
    networkCapacity: ActiveConnection[],
    capacityDisabled: boolean,
    mode: ProtocolCommand
}

const SaveButtons = () => {
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string>("")
    const {
        activeConnections,
        networkGoalDisabled,
        setNetworkGoalDisabled,
        networkCapacityDisabled,
        setNetworkCapacityDisabled,
        networkCapacityConnections,
        getUserCodeCallback,
        getGraphCallback,
        setActiveConnections,
        setNetworkCapacityConnections,
        setUserCodeCallback,
        setGraphCallback,
        setSelectedCommand,
        selectedCommand
    } = useRunEngine()
    const [isLoadOpen, setIsLoadOpen] = useState(false);
    const [allSaves, setAllSaves] = useState<localStorageSave[]>([])
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    // const [isSaveToDiskOpen, setIsSaveToDiskOpen] = useState(false);
    const [isExamplesOpen, setIsExamplesOpen] = useState(false)


    //Save to disk function
    {/* const handleSaveToDisk = async () => {
        const savedName = nameInputRef.current?.value;

        if (savedName === "" || !savedName) {
            setError("Please enter a valid name")
            return
        }

        if (!getUserCodeCallback || !getGraphCallback) {
            setError("Could not save. Please wait a few seconds and try again")
            return
        }

        setError("");
        const userCode = getUserCodeCallback();
        const graph = getGraphCallback();
        const save: exampleSave = {
            id: crypto.randomUUID(),
            name: savedName,
            code: userCode,
            graph,
            goal: activeConnections,
            goalDisabled: networkGoalDisabled,
            networkCapacity: networkCapacityConnections,
            capacityDisabled: networkCapacityDisabled,
        }



        await fetch('/api/save-json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: `${savedName}.json`,
                data: save
            })
        })
        setIsSaveToDiskOpen(false);
    } */
    }


    const handleSave = () => {
        const savedName = nameInputRef.current?.value;

        const alreadyPresentNames = allSaves.map((save) => save.name)

        if (savedName === "" || !savedName) {
            setError("Please enter a valid name")
            return
        }

        if (alreadyPresentNames.includes(savedName)) {
            setError("Save with this name already exists")
            return
        }

        if (!getUserCodeCallback || !getGraphCallback) {
            setError("Could not save. Please wait a few seconds and try again")
            return
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
            goal: activeConnections,
            goalDisabled: networkGoalDisabled,
            networkCapacity: networkCapacityConnections,
            capacityDisabled: networkCapacityDisabled,
            mode: selectedCommand
        }

        let saves: localStorageSave[] = [];
        let memory = localStorage.getItem("savedStates")
        if (memory) {
            saves = JSON.parse(memory)
        }

        saves.push(save);
        localStorage.setItem("savedStates", JSON.stringify(saves));

        setAllSaves(saves);
        setIsSaveOpen(false);

    };

    const LoadAllSaves = () => {
        let allSaves: localStorageSave[] = [];
        let memory = localStorage.getItem("savedStates")
        if (memory) {
            allSaves = JSON.parse(memory)
        }

        return allSaves
    }

    useEffect(() => {
        setAllSaves(LoadAllSaves())
    }, []);

    const handleDeleteSave = (saves: localStorageSave[], save: localStorageSave) => {
        localStorage.removeItem("savedStates");
        const newSaves = saves.filter((s) => s !== save)
        localStorage.setItem("savedStates", JSON.stringify(newSaves));
        setAllSaves(newSaves)
    }

    const handleLoad = (save: localStorageSave | exampleSave) => {
        try {
            setActiveConnections(save.goal);
            setNetworkCapacityConnections(save.networkCapacity);
            setNetworkCapacityDisabled(save.capacityDisabled)
            setNetworkGoalDisabled(save.goalDisabled)
            setSelectedCommand(save.mode)

            if (setGraphCallback && setUserCodeCallback) {
                setGraphCallback(save.graph.nodes, save.graph.edges);

                setTimeout(() => {
                    setUserCodeCallback(save.code);
                }, 0);
            }

            setIsLoadOpen(false);
            setIsExamplesOpen(false)
        } catch (err) {
            setError("Failed to parse or load data correctly.");
        }
    }

    const handleShare = () => {
        if (!getUserCodeCallback || !getGraphCallback) {
            toast.error("Editor is not loaded yet. Try again later.")
            return
        }

        const shareState = {
            code: getUserCodeCallback(),
            graph: getGraphCallback(),
            goal: activeConnections,
            goalDisabled: networkGoalDisabled,
            networkCapacity: networkCapacityConnections,
            capacityDisabled: networkCapacityDisabled,
            mode: selectedCommand
        };

        const jsonStr = JSON.stringify(shareState);
        const base64Token = btoa(encodeURIComponent(jsonStr));

        const shareableUrl = `${window.location.origin}/load/${base64Token}`;

        navigator.clipboard.writeText(shareableUrl);

        toast("Link has been copied to clipboard")
    };

    return (
        <div className="flex gap-4 text-center">
            {/*SAVE*/}
            <Dialog open={isSaveOpen} onOpenChange={(open) => {
                setIsSaveOpen(open);
                if (!open) setError("");
            }}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="p-5 border-2 border-secondary-foreground dark:hover:bg-muted">
                        Save
                    </Button>
                </DialogTrigger>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle className="text-secondary-foreground text-xl">Name your saved state</DialogTitle>
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
                            <Button variant="outline"
                                    className="px-5 border-2 border-secondary-foreground dark:hover:bg-muted">
                                Cancel
                            </Button>
                        </DialogClose>

                        <Button
                            variant="outline"
                            className="px-5 border-2 border-secondary-foreground dark:hover:bg-muted"
                            onClick={handleSave}
                        >
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>


            {/*LOAD*/}

            <Dialog open={isLoadOpen} onOpenChange={(open) => {
                setIsLoadOpen(open);
                if (!open) setError("");
            }}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="p-5 border-2 border-secondary-foreground dark:hover:bg-muted">
                        Load
                    </Button>
                </DialogTrigger>
                <DialogContent showCloseButton={false} className="sm:max-w-xl">
                    <DialogHeader className="flex flex-col items-center gap-4">
                        <DialogTitle className="text-xl w-full text-left">Load a save</DialogTitle>
                        <div className="flex flex-col gap-2 w-full px-10">
                            {allSaves.map((save) => (
                                <LocalSaveDisplayCard
                                    save={save}
                                    deleteSave={() => {
                                        handleDeleteSave(allSaves, save)
                                    }}
                                    handleLoad={() => handleLoad(save)}
                                    key={save.id}
                                />
                            ))}
                        </div>
                    </DialogHeader>

                    <div className="flex justify-end gap-2 mt-4">
                        <DialogClose asChild>
                            <Button variant="outline"
                                    className="text-sm px-10 py-4 border-2 border-secondary-foreground dark:hover:bg-muted">
                                Cancel
                            </Button>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>

            {/*SHARE*/}
            <Button onClick={handleShare} variant="outline"
                    className="p-5 border-2 border-secondary-foreground dark:hover:bg-muted">
                Share
            </Button>

            {/*EXAMPLES*/}
            <Dialog open={isExamplesOpen} onOpenChange={(open) => {
                setIsExamplesOpen(open);
                if (!open) setError("");
            }}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="p-5 border-2 border-secondary-foreground dark:hover:bg-muted">
                        Examples
                    </Button>
                </DialogTrigger>
                <DialogContent showCloseButton={false} className="sm:max-w-xl">
                    <DialogHeader className="flex flex-col items-center gap-4">
                        <DialogTitle className="text-xl text-left w-full pl-3">Load an Example</DialogTitle>
                        <ExampleSelectionCard probabilisticSaves={exampleSaves}
                                              quantisticSaves={exampleSaves}
                                              handleLoad={handleLoad}
                        />
                    </DialogHeader>

                    <div className="flex justify-end gap-2 mt-4">
                        <DialogClose asChild>
                            <Button variant="outline"
                                    className="text-sm px-10 py-4 border-2 border-secondary-foreground dark:hover:bg-muted">
                                Cancel
                            </Button>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>


            {/*Save to disk Button Temp*/}
            {/*
            <Dialog open={isSaveToDiskOpen} onOpenChange={(open) => {
                setIsSaveToDiskOpen(open);
                if (!open) setError("");
            }}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="p-5 border-2 border-secondary-foreground dark:hover:bg-muted">
                        Save to disk
                    </Button>
                </DialogTrigger>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle className="text-secondary-foreground text-xl">Name your saved state</DialogTitle>
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
                            <Button variant="outline"
                                    className="px-5 border-2 border-secondary-foreground dark:hover:bg-muted">
                                Cancel
                            </Button>
                        </DialogClose>

                        <Button
                            variant="outline"
                            className="px-5 border-2 border-secondary-foreground dark:hover:bg-muted"
                            onClick={handleSaveToDisk}
                        >
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog> */}
        </div>
    );
};

export default SaveButtons;