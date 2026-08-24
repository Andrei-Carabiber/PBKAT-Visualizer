import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {
    ArrowLeftRight,
    Bookmark,
    History,
    RefreshCw,
    SquareX,
    Trash2,
} from "lucide-react";
import {toast} from "sonner";

import {
    type HistoryItem,
    type ProtocolJobStatus,
    useRunEngine,
} from "@/store/runEngine.ts";
import {useCompareStore} from "@/store/useCompareStore.ts";
import type {localStorageSave} from "./SaveButtons.tsx";

import {Button} from "@/components/ui/button.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import {ScrollArea} from "@/components/ui/scroll-area.tsx";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs.tsx";
import RunStatusBadge from "@/components/main/result_display/RunStatusBadge.tsx";
import RenameRunButton from "@/components/main/result_display/RenameRunButton.tsx";

interface HistoryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onLoadHistory: (item: HistoryItem) => void;
    saves: localStorageSave[];
    onLoadSave: (save: localStorageSave) => void;
    setAllSaves: (saves: localStorageSave[]) => void;
}

const ACTIVE_STATUSES: ProtocolJobStatus[] = ["queued", "running"];

const RETRYABLE_STATUSES: ProtocolJobStatus[] = [
    "failed",
    "interrupted",
    "timed_out",
];

function getRunStatus(item: HistoryItem): ProtocolJobStatus {
    // Old history entries did not have a status and were all completed.
    return item.status ?? "completed";
}

function isActiveRun(item: HistoryItem): boolean {
    return ACTIVE_STATUSES.includes(getRunStatus(item));
}

function isRetryableRun(item: HistoryItem): boolean {
    return RETRYABLE_STATUSES.includes(getRunStatus(item));
}

function isComparableRun(item: HistoryItem): boolean {
    return (
        getRunStatus(item) === "completed" &&
        Boolean(item.settings.result)
    );
}

function getStageText(item: HistoryItem): string | null {
    const status = getRunStatus(item);

    if (status === "queued") {
        return item.queuePosition != null
            ? `Waiting in queue at position ${item.queuePosition}`
            : "Waiting for an available worker";
    }

    if (status !== "running") {
        return null;
    }

    switch (item.stage) {
        case "building-model":
            return "Building model…";

        case "calculating":
            return "Calculating…";

        case "calculating-quality":
            return "Calculating quality…";

        default:
            return "Starting calculation…";
    }
}

const HistoryDialog = ({
                           isOpen,
                           onOpenChange,
                           onLoadHistory,
                           saves,
                           onLoadSave,
                           setAllSaves,
                       }: HistoryDialogProps) => {
    const [activeTab, setActiveTab] =
        useState<"history" | "saved">("history");
    const [compareModeOn, setCompareModeOn] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const {
        runHistory: historyItems,
        hydrateRunHistory,
        removeRunHistory,
        cancelJob,
        retryJob,
    } = useRunEngine();

    const navigate = useNavigate();
    const setCompareItems = useCompareStore(
        (state) => state.setCompareItems
    );

    /*
     * Newest updated runs first. This means an active run stays near
     * the top as its status changes.
     */
    const sortedHistoryItems = useMemo(() => {
        return historyItems
            .slice()
            .sort((first, second) => {
                const firstDate = new Date(
                    first.updatedAt ?? first.savedAt
                ).getTime();

                const secondDate = new Date(
                    second.updatedAt ?? second.savedAt
                ).getTime();

                return secondDate - firstDate;
            });
    }, [historyItems]);

    const activeRuns = useMemo(
        () => sortedHistoryItems.filter(isActiveRun),
        [sortedHistoryItems]
    );

    const recentRuns = useMemo(
        () => sortedHistoryItems.filter((item) => !isActiveRun(item)),
        [sortedHistoryItems]
    );

    const comparableRunCount = useMemo(
        () => historyItems.filter(isComparableRun).length,
        [historyItems]
    );

    useEffect(() => {
        if (isOpen) {
            hydrateRunHistory();
            return;
        }

        setSelectedIds([]);
        setCompareModeOn(false);
    }, [isOpen, hydrateRunHistory]);

    /*
     * Remove selections that are no longer available or comparable.
     * This can happen if a run is deleted while compare mode is open.
     */
    useEffect(() => {
        setSelectedIds((currentIds) =>
            currentIds.filter((id) =>
                historyItems.some(
                    (item) =>
                        item.id === id &&
                        isComparableRun(item)
                )
            )
        );
    }, [historyItems]);

    const onDeleteSave = (save: localStorageSave) => {
        const updatedSaves = saves.filter(
            (existingSave) => existingSave.id !== save.id
        );

        localStorage.setItem(
            "savedStates",
            JSON.stringify(updatedSaves)
        );

        setAllSaves(updatedSaves);
        toast.success("Saved state deleted");
    };

    const handleClearAllSaves = () => {
        localStorage.removeItem("savedStates");
        setAllSaves([]);
        toast.success("All saved states cleared");
    };

    const handleToggleCompareMode = (checked: boolean) => {
        setCompareModeOn(checked);

        if (!checked) {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id: string) => {
        const item = historyItems.find(
            (historyItem) => historyItem.id === id
        );

        if (!item || !isComparableRun(item)) {
            toast.info(
                "Only completed runs with results can be compared"
            );
            return;
        }

        setSelectedIds((currentIds) => {
            if (currentIds.includes(id)) {
                return currentIds.filter(
                    (selectedId) => selectedId !== id
                );
            }

            if (currentIds.length >= 2) {
                toast.info(
                    "You can only compare 2 runs at a time"
                );
                return currentIds;
            }

            return [...currentIds, id];
        });
    };

    const handleDeleteItem = (item: HistoryItem) => {
        if (isActiveRun(item)) {
            toast.info(
                "Cancel this run before removing it from history"
            );
            return;
        }

        removeRunHistory(item.id);

        setSelectedIds((currentIds) =>
            currentIds.filter(
                (selectedId) => selectedId !== item.id
            )
        );

        toast.success("Run deleted");
    };

    /*
     * Only terminal jobs are cleared. Queued/running jobs remain visible
     * so the browser does not lose track of active backend work.
     */
    const handleClearFinishedRuns = () => {
        const finishedRuns = historyItems.filter(
            (item) => !isActiveRun(item)
        );

        finishedRuns.forEach((item) => {
            removeRunHistory(item.id);
        });

        setSelectedIds([]);
        toast.success("Finished run history cleared");
    };

    const handleClearUntitledRuns = () => {
        const removableRuns = historyItems.filter(
            (item) =>
                item.name === "Untitled" &&
                !isActiveRun(item)
        );

        removableRuns.forEach((item) => {
            removeRunHistory(item.id);
        });

        setSelectedIds((currentIds) =>
            currentIds.filter((id) =>
                historyItems.some(
                    (item) =>
                        item.id === id &&
                        !removableRuns.some(
                            (removed) => removed.id === item.id
                        )
                )
            )
        );

        toast.success("Finished untitled runs cleared");
    };

    const handleCompare = () => {
        const [firstId, secondId] = selectedIds;

        const itemA = historyItems.find(
            (item) => item.id === firstId
        );

        const itemB = historyItems.find(
            (item) => item.id === secondId
        );

        if (
            !itemA ||
            !itemB ||
            !isComparableRun(itemA) ||
            !isComparableRun(itemB)
        ) {
            toast.error(
                "Both selected runs must have completed results"
            );
            return;
        }

        setCompareItems(itemA, itemB);
        onOpenChange(false);
        navigate("/compare");
    };

    const handleCancelRun = async (item: HistoryItem) => {
        if (!item.jobId) {
            toast.error("This run does not have a backend job ID");
            return;
        }

        await cancelJob(item.jobId);
    };

    const handleRetryRun = async (item: HistoryItem) => {
        if (!item.jobId) {
            toast.error("This run does not have a backend job ID");
            return;
        }

        await retryJob(item.jobId);
    };

    const renderRun = (item: HistoryItem) => {
        const status = getRunStatus(item);
        const active = isActiveRun(item);
        const retryable = isRetryableRun(item);
        const comparable = isComparableRun(item);
        const isSelected = selectedIds.includes(item.id);
        const stageText = getStageText(item);

        return (
            <div
                key={item.id}
                onClick={() => {
                    if (compareModeOn && comparable) {
                        handleToggleSelect(item.id);
                    }
                }}
                className={[
                    "rounded-lg border p-3 transition-colors",
                    isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border",
                    compareModeOn && comparable
                        ? "cursor-pointer hover:bg-muted/50"
                        : "",
                    compareModeOn && !comparable
                        ? "opacity-50"
                        : "",
                    !compareModeOn
                        ? "hover:bg-muted/40"
                        : "",
                ].join(" ")}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                        {compareModeOn && (
                            <Checkbox
                                checked={isSelected}
                                disabled={!comparable}
                                onCheckedChange={() => {
                                    if (comparable) {
                                        handleToggleSelect(item.id);
                                    }
                                }}
                                onClick={(event) =>
                                    event.stopPropagation()
                                }
                                className="mt-1"
                            />
                        )}

                        <div className="min-w-0 flex-1 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="max-w-full truncate text-sm font-medium text-foreground">
                                    {item.name}
                                </span>

                                <RunStatusBadge
                                    status={status}
                                    queuePosition={
                                        item.queuePosition
                                    }
                                />

                                {(item.attempt ?? 1) > 1 && (
                                    <span className="text-[11px] text-muted-foreground">
                                        Attempt {item.attempt}
                                    </span>
                                )}
                            </div>

                            <p className="mt-1 text-xs text-muted-foreground">
                                {new Date(
                                    item.savedAt
                                ).toLocaleString()}
                            </p>

                            {stageText && (
                                <p className="mt-1 text-xs font-medium text-primary">
                                    {stageText}
                                </p>
                            )}

                            {item.error && (
                                <p
                                    className="mt-2 line-clamp-2 text-xs text-destructive"
                                    title={item.error}
                                >
                                    {item.error}
                                </p>
                            )}
                        </div>
                    </div>

                    {!compareModeOn && (
                        <div className="flex shrink-0 items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onLoadHistory(item);
                                }}
                                className="h-8 px-3 text-xs"
                            >
                                Load
                            </Button>

                            <RenameRunButton
                                item={item}
                                compact
                            />

                            {active && item.jobId && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Cancel run"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        void handleCancelRun(item);
                                    }}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                    <SquareX className="h-4 w-4" />
                                </Button>
                            )}

                            {retryable && item.jobId && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Retry run"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        void handleRetryRun(item);
                                    }}
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={active}
                                title={
                                    active
                                        ? "Cancel the run before deleting it"
                                        : "Delete run"
                                }
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteItem(item);
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader className="flex flex-col gap-2">
                    <DialogTitle className="text-xl">
                        Runs & Saved States
                    </DialogTitle>
                </DialogHeader>

                <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                        setActiveTab(
                            value as "history" | "saved"
                        )
                    }
                >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                        <TabsList className="grid w-64 grid-cols-2">
                            <TabsTrigger
                                value="history"
                                className="flex items-center gap-1.5 text-xs"
                            >
                                <History className="h-3.5 w-3.5" />
                                Runs ({historyItems.length})
                            </TabsTrigger>

                            <TabsTrigger
                                value="saved"
                                className="flex items-center gap-1.5 text-xs"
                            >
                                <Bookmark className="h-3.5 w-3.5" />
                                Saved ({saves.length})
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === "history" &&
                            recentRuns.length > 0 && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={
                                            handleClearUntitledRuns
                                        }
                                        className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        Clear Untitled
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={
                                            handleClearFinishedRuns
                                        }
                                        className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        Clear Finished
                                    </Button>
                                </div>
                            )}

                        {activeTab === "saved" &&
                            saves.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={
                                        handleClearAllSaves
                                    }
                                    className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                    Clear All
                                </Button>
                            )}
                    </div>

                    {/* Runs tab */}
                    <TabsContent
                        value="history"
                        className="mt-3 space-y-3"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <DialogDescription className="text-left text-xs text-muted-foreground">
                                {compareModeOn
                                    ? "Select two completed runs with results."
                                    : "Monitor jobs or restore a run's editor configuration."}
                            </DialogDescription>

                            {comparableRunCount > 1 && (
                                <label className="ml-2 flex shrink-0 cursor-pointer select-none items-center gap-2 text-xs font-medium">
                                    <Checkbox
                                        checked={compareModeOn}
                                        onCheckedChange={(
                                            checked
                                        ) =>
                                            handleToggleCompareMode(
                                                Boolean(checked)
                                            )
                                        }
                                    />
                                    Compare Mode
                                </label>
                            )}
                        </div>

                        <ScrollArea
                            type="always"
                            className="h-[50vh] w-full pr-4"
                        >
                            {historyItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-14 text-center">
                                    <History className="mb-3 h-8 w-8 text-muted-foreground/40" />

                                    <p className="text-sm font-medium">
                                        No runs yet
                                    </p>

                                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                                        Submitted protocols will
                                        appear here immediately,
                                        including queued and running
                                        jobs.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {activeRuns.length > 0 && (
                                        <section className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Active runs
                                                </h3>

                                                <span className="text-xs text-muted-foreground">
                                                    {
                                                        activeRuns.length
                                                    }
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                {activeRuns.map(
                                                    renderRun
                                                )}
                                            </div>
                                        </section>
                                    )}

                                    {recentRuns.length > 0 && (
                                        <section className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Recent runs
                                                </h3>

                                                <span className="text-xs text-muted-foreground">
                                                    {
                                                        recentRuns.length
                                                    }
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                {recentRuns.map(
                                                    renderRun
                                                )}
                                            </div>
                                        </section>
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    {/* Saved states tab */}
                    <TabsContent
                        value="saved"
                        className="mt-3 space-y-3"
                    >
                        <DialogDescription className="text-left text-xs text-muted-foreground">
                            Load or delete configurations manually
                            saved in this browser.
                        </DialogDescription>

                        <ScrollArea
                            type="always"
                            className="h-[50vh] w-full pr-4"
                        >
                            <div className="flex flex-col gap-2.5">
                                {saves.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-14 text-center">
                                        <Bookmark className="mb-3 h-8 w-8 text-muted-foreground/40" />

                                        <p className="text-sm font-medium">
                                            No saved states
                                        </p>

                                        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                                            Click Save in the header
                                            to store the current editor
                                            configuration.
                                        </p>
                                    </div>
                                ) : (
                                    saves
                                        .slice()
                                        .sort(
                                            (first, second) =>
                                                second.savedDate -
                                                first.savedDate
                                        )
                                        .map((save) => (
                                            <div
                                                key={save.id}
                                                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                                            >
                                                <div className="flex min-w-0 flex-1 flex-col pr-3 text-left">
                                                    <span className="truncate text-sm font-medium text-foreground">
                                                        {save.name}
                                                    </span>

                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(
                                                            save.savedDate
                                                        ).toLocaleString()}
                                                    </span>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            onLoadSave(
                                                                save
                                                            )
                                                        }
                                                        className="h-8 px-3 text-xs"
                                                    >
                                                        Load
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Delete saved state"
                                                        onClick={() =>
                                                            onDeleteSave(
                                                                save
                                                            )
                                                        }
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                <div className="mt-4 flex items-center justify-between">
                    <div>
                        {activeTab === "history" &&
                            compareModeOn && (
                                <span className="text-xs font-medium text-muted-foreground">
                                    {selectedIds.length}/2 selected
                                </span>
                            )}
                    </div>

                    <div className="flex justify-end gap-2">
                        {activeTab === "history" &&
                            compareModeOn && (
                                <Button
                                    disabled={
                                        selectedIds.length !== 2
                                    }
                                    onClick={handleCompare}
                                    className="px-4"
                                >
                                    <ArrowLeftRight className="mr-1.5 h-4 w-4" />
                                    Compare
                                </Button>
                            )}

                        <DialogClose asChild>
                            <Button
                                variant="outline"
                                className="px-6"
                            >
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