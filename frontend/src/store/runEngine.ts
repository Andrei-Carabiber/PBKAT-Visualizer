import { create } from 'zustand';
import type { Node, Edge } from "@xyflow/react";
import type { NodeData, EdgeData } from "@/components/main/node_editor/nodeEditor.tsx";
import { isCodeValid, isCodeCorrect } from "@/components/main/text_editor/protocolParser.ts";
import {
    isQuantumCode,
} from "@/components/main/text_editor/haskellBoilerplate.ts";
import type { DataType } from "@/components/main/result_display/DataType.ts";
import { useCustomization } from "@/store/customization.ts";
import { formatData, type FormattedDataType } from "@/store/formatData.ts";
// 1. Import get, set, and del with aliases to avoid conflicts with Zustand's get/set
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

export interface ActiveConnection {
    id: string;
    label: string;
}

export type LastSettingsRan = {
    id: string;
    code: string;
    graph: {
        nodes: Node<NodeData>[];
        edges: Edge<EdgeData>[];
    };
    goal: ActiveConnection[];
    goalDisabled: boolean;
    networkCapacity: ActiveConnection[];
    capacityDisabled: boolean;

    truncation?: number;
    coverage?: number;
    truncationActive?: boolean;

    result?: FormattedDataType;
    dateWhenRan: number;
};

export interface HistoryItem {
    id: string;
    jobId?: string;
    name: string;
    settings: LastSettingsRan;
    savedAt: string;
    updatedAt?: string;
    status?: ProtocolJobStatus;
    stage?: ProtocolJob["stage"];
    queuePosition?: number;
    attempt?: number;
    error?: string;
}

export type ProtocolJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted" | "timed_out";

export type ProtocolJob = {
    jobId: string;
    status: ProtocolJobStatus;
    createdAt: string;
    attempt: number;
    stage?: "building-model" | "calculating" | "calculating-quality";
    queuePosition?: number;
    result?: DataType;
    error?: string;
};

interface RunEngineState {
    loading: boolean;
    data: DataType | null;
    cached: boolean;
    formattedData: FormattedDataType | null;
    lastSettingsRan: LastSettingsRan | null;
    setLastSettingsRan: (newSettings: LastSettingsRan) => void;
    error: string | null;
    activeJob: ProtocolJob | null;
    getCodeCallback: (() => string) | null;
    getUserCodeCallback: (() => string) | null;
    getGraphCallback: (() => { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] }) | null;
    setGraphCallback: ((nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => void) | null;
    setUserCodeCallback: ((code: string) => void) | null;

    networkGoalDisabled: boolean;
    goalConnections: ActiveConnection[];
    setNetworkGoalDisabled: (disabled: boolean) => void;
    setGoalConnections: (connections: ActiveConnection[] | ((prev: ActiveConnection[]) => ActiveConnection[])) => void;

    networkCapacityDisabled: boolean;
    networkCapacityConnections: ActiveConnection[];
    setNetworkCapacityDisabled: (disabled: boolean) => void;
    setNetworkCapacityConnections: (connections: ActiveConnection[] | ((prev: ActiveConnection[]) => ActiveConnection[])) => void;

    pendingSharedState: PendingState | null;
    setPendingSharedState: (state: PendingState | null) => void;

    truncation: number;
    coverage: number;
    setTruncation: (value: number) => void;
    setCoverage: (value: number) => void;
    truncationActive: boolean;
    setTruncationActive: (value: boolean) => void;

    registerEditor: (callback: () => string) => void;
    registerUserCodeGetter: (callback: () => string) => void;
    registerGraph: (callback: () => { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] }) => void;
    registerGraphSetter: (callback: (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => void) => void;
    registerUserCodeSetter: (callback: (code: string) => void) => void;
    handleRun: () => Promise<void>;
    runHistory: HistoryItem[];
    renameRunHistory: (id: string, name: string) => void;
    hydrateRunHistory: () => Promise<void>; // Updated to Promise
    upsertRunHistory: (item: HistoryItem) => void;
    removeRunHistory: (id: string) => void;
    clearRunHistory: (onlyUntitled?: boolean) => void;
    cancelJob: (jobId: string) => Promise<void>;
    cancelActiveJob: () => Promise<void>;
    retryJob: (jobId: string) => Promise<void>;
    retryActiveJob: () => Promise<void>;
    resumeSavedJob: () => Promise<void>;
    pollProtocolJob: (
        jobId: string,
        options?: { showInOutput?: boolean }
    ) => Promise<void>;
    showHistoryResult: (item: HistoryItem) => void;
    clearOutput: () => void;

    viewMode: "protocol" | "node"
    setViewMode: (viewMode: "protocol" | "node") => void;
}

export type RunContext = {
    userRawCode: string;
    graphSnapshot: {
        nodes: Node<NodeData>[];
        edges: Edge<EdgeData>[];
    };
    goal: ActiveConnection[];
    goalDisabled: boolean;
    networkCapacity: ActiveConnection[];
    capacityDisabled: boolean;

    truncation: number;
    coverage: number;
    truncationActive: boolean;
};

interface PendingState {
    code: string;
    graph: { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] };
}

const RUN_PROTOCOL_URL = "/api/run-protocol";
const ACTIVE_PROTOCOL_JOB_STORAGE_KEY = "active-protocol-job";
const RUN_HISTORY_STORAGE_KEY = "history";

// 2. Updated helper methods to async using idbGet / idbSet
async function readRunHistory(): Promise<HistoryItem[]> {
    try {
        const raw = await idbGet(RUN_HISTORY_STORAGE_KEY);
        if (!raw) return [];

        // idb-keyval supports storing objects natively, but we include a fallback for stringified data.
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

        return parsed.map((item: any) => ({
            ...item,
            jobId: item.jobId ?? item.id,
            status: item.status ?? "completed",
            attempt: item.attempt ?? 1,
            updatedAt: item.updatedAt ?? item.savedAt,
        }));
    } catch {
        return [];
    }
}

async function writeRunHistory(items: HistoryItem[]): Promise<void> {
    try {
        await idbSet(RUN_HISTORY_STORAGE_KEY, items);
    } catch (error) {
        console.error("Failed to write run history:", error);
    }
}

async function saveActiveJobId(jobId: string | null): Promise<void> {
    if (jobId) await idbSet(ACTIVE_PROTOCOL_JOB_STORAGE_KEY, jobId);
    else await idbDel(ACTIVE_PROTOCOL_JOB_STORAGE_KEY);
}

const POLL_INTERVAL_MS = 2_000;
const resumingJobIds = new Set<string>();

const terminalJobStatuses: Set<ProtocolJobStatus> = new Set(["completed", "failed", "cancelled", "interrupted", "timed_out"]);

function isTerminalJob(status: ProtocolJobStatus): boolean {
    return terminalJobStatuses.has(status);
}

export const useRunEngine = create<RunEngineState>((set, get) => ({
    viewMode: 'protocol',
    setViewMode: (viewMode => { set({ viewMode }) }),
    loading: false,
    data: null,
    formattedData: null,
    lastSettingsRan: null,
    setLastSettingsRan: (newSettings) => { set({ lastSettingsRan: newSettings }) },
    cached: false,
    error: null,
    activeJob: null,
    getCodeCallback: null,
    getUserCodeCallback: null,
    setGraphCallback: null,
    setUserCodeCallback: null,
    getGraphCallback: null,

    pendingSharedState: null,
    setPendingSharedState: (pendingSharedState) => {
        set({ pendingSharedState })
    },

    truncation: 100,
    coverage: 0.99,
    setTruncation: (truncation) => set({ truncation }),
    setCoverage: (coverage) => set({ coverage }),
    truncationActive: true,
    setTruncationActive: (bool) => set({ truncationActive: bool }),

    networkGoalDisabled: false,
    goalConnections: [{ label: '"A" ~ "C"', id: crypto.randomUUID(), }],
    setNetworkGoalDisabled: (disabled) => set({ networkGoalDisabled: disabled }),
    setGoalConnections: (updater) => {
        if (typeof updater === 'function') {
            set((state) => ({ goalConnections: updater(state.goalConnections) }));
        } else {
            set({ goalConnections: updater });
        }
    },

    networkCapacityDisabled: false,
    networkCapacityConnections: [{ label: '"A" ~ "C"', id: crypto.randomUUID() }, {
        label: '"C" ~ "C"',
        id: crypto.randomUUID()
    }, { label: '"C" ~ "C"', id: crypto.randomUUID() },],
    setNetworkCapacityDisabled: (disabled) => set({ networkCapacityDisabled: disabled }),
    setNetworkCapacityConnections: (updater) => {
        if (typeof updater === 'function') {
            set((state) => ({ networkCapacityConnections: updater(state.networkCapacityConnections) }));
        } else {
            set({ networkCapacityConnections: updater });
        }
    },

    registerEditor: (callback) => set({ getCodeCallback: callback }),
    registerUserCodeGetter: (callback) => set({ getUserCodeCallback: callback }),
    registerGraph: (callback) => set({ getGraphCallback: callback }),
    registerGraphSetter: (callback) => {
        set({ setGraphCallback: callback })
        const pending = get().pendingSharedState;
        if (pending?.graph) {
            callback(pending.graph.nodes, pending.graph.edges);
            if (get().setUserCodeCallback) set({ pendingSharedState: null });
        }
    },
    registerUserCodeSetter: (callback) => {
        set({ setUserCodeCallback: callback });
        const pending = get().pendingSharedState;
        if (pending?.code) {
            callback(pending.code);
            if (get().setGraphCallback) set({ pendingSharedState: null });
        }
    },

    runHistory: [],

    hydrateRunHistory: async () => {
        const history = await readRunHistory();
        set({ runHistory: history });
    },

    upsertRunHistory: (item) => {
        set((state) => {
            const index = state.runHistory.findIndex(
                (existing) =>
                    existing.id === item.id ||
                    (existing.jobId && item.jobId && existing.jobId === item.jobId)
            );

            const next = [...state.runHistory];

            if (index === -1) {
                next.push(item);
            } else {
                next[index] = {
                    ...next[index],
                    ...item,
                    settings: {
                        ...next[index].settings,
                        ...item.settings,
                    },
                };
            }

            writeRunHistory(next); // "Fire and forget" async save
            return { runHistory: next };
        });
    },

    removeRunHistory: (id) => {
        set((state) => {
            const next = state.runHistory.filter((item) => item.id !== id);
            writeRunHistory(next);
            return { runHistory: next };
        });
    },

    clearRunHistory: (onlyUntitled = false) => {
        set((state) => {
            const next = onlyUntitled
                ? state.runHistory.filter((item) => item.name !== "Untitled")
                : [];

            writeRunHistory(next);
            return { runHistory: next };
        });
    },

    handleRun: async () => {
        const {
            getCodeCallback,
            getGraphCallback,
            getUserCodeCallback,
            networkGoalDisabled,
            goalConnections,
            networkCapacityDisabled,
            networkCapacityConnections,
            truncation,
            coverage,
            truncationActive,
        } = get();

        if (!getCodeCallback) {
            set({
                error: "The code editor is still initializing language servers. Please wait a moment and try again. (Wait 10seconds)",
                loading: false
            });
            return;
        }

        const fullCode = getCodeCallback();
        const userRawCode = getUserCodeCallback?.() ?? fullCode;
        const graphSnapshot = getGraphCallback?.() ?? { nodes: [], edges: [] };

        set({ loading: true, error: null, data: null, formattedData: null });

        if (fullCode) {
            const codeCorrection = isCodeCorrect(userRawCode);
            if (!codeCorrection.valid) {
                set({
                    error: codeCorrection.error,
                    loading: false
                });
                return
            }

            const validation = isCodeValid(userRawCode, graphSnapshot.nodes, graphSnapshot.edges);

            if (!validation.valid) {
                set({
                    error: validation.error,
                    loading: false
                });
                return;
            }
        }

        const quantum = isQuantumCode(userRawCode);
        const mode: "quantum" | "probabilistic" = quantum ? "quantum" : "probabilistic";

        if ((networkGoalDisabled || goalConnections.length === 0) && mode === 'quantum') {
            set({
                error: "You must have a network goal if using quantum mode. Goal cannot be disabled/empty",
                loading: false
            });
            return
        }

        let command: "run" | "probability" | "quantum" = 'run'
        if (mode === 'quantum') {
            command = 'quantum'
        } else if (!networkGoalDisabled) {
            command = 'probability'
        }

        const computeWernerQuality = useCustomization.getState().computeWernerQuality;

        try {
            const payload = {
                code: fullCode,
                command,
                truncation: truncationActive ? truncation : -1,
                coverage: truncationActive ? -1 : coverage,
                probOnly: !computeWernerQuality
            }

            const response = await fetch(RUN_PROTOCOL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                set({
                    error: body.error ?? `Request failed with status ${response.status}`,
                    loading: false,
                });
                return;
            }

            const job = await response.json() as ProtocolJob;

            const runContext: RunContext = {
                userRawCode,
                graphSnapshot,
                goal: structuredClone(goalConnections),
                goalDisabled: networkGoalDisabled,
                networkCapacity: structuredClone(networkCapacityConnections),
                capacityDisabled: networkCapacityDisabled,
                truncation,
                coverage,
                truncationActive,
            };

            const settings: LastSettingsRan = {
                id: job.jobId,
                code: runContext.userRawCode,
                graph: runContext.graphSnapshot,
                goal: runContext.goal,
                goalDisabled: runContext.goalDisabled,
                networkCapacity: runContext.networkCapacity,
                capacityDisabled: runContext.capacityDisabled,
                truncation: runContext.truncation,
                coverage: runContext.coverage,
                truncationActive: runContext.truncationActive,
                dateWhenRan: Date.now(),
            };

            get().upsertRunHistory({
                id: job.jobId,
                jobId: job.jobId,
                name: "Untitled",
                settings,
                savedAt: job.createdAt ?? new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: job.status,
                stage: job.stage,
                queuePosition: job.queuePosition,
                attempt: job.attempt,
                error: job.error,
            });

            await saveActiveJobId(job.jobId);

            set({
                activeJob: job,
                loading: !isTerminalJob(job.status),
            });

            await get().pollProtocolJob(job.jobId);

        } catch (e: any) {
            set({ error: e.message || "An error occurred.", loading: false });
        }
    },
    cancelJob: async (jobId) => {
        try {
            const response = await fetch(`${RUN_PROTOCOL_URL}/${jobId}`, {
                method: "DELETE",
            });

            const body = await response.json() as ProtocolJob | { error?: string };

            if (!response.ok) {
                throw new Error(
                    "error" in body
                        ? body.error
                        : "Could not cancel the calculation."
                );
            }

            const job = body as ProtocolJob;
            const historyItem = get().runHistory.find(
                (item) => item.jobId === jobId
            );

            if (historyItem) {
                get().upsertRunHistory({
                    ...historyItem,
                    status: job.status,
                    stage: job.stage,
                    queuePosition: job.queuePosition,
                    attempt: job.attempt,
                    error: job.error,
                    updatedAt: new Date().toISOString(),
                });
            }

            if (get().activeJob?.jobId === jobId) {
                set({
                    activeJob: job,
                    loading: false,
                });
                await saveActiveJobId(null);
            }
        } catch (error: any) {
            set({
                error: error.message || "Could not cancel the calculation.",
            });
        }
    },

    retryJob: async (jobId) => {
        try {
            const response = await fetch(
                `${RUN_PROTOCOL_URL}/${jobId}/retry`,
                { method: "POST" }
            );

            const body = await response.json() as ProtocolJob | { error?: string };

            if (!response.ok) {
                throw new Error(
                    "error" in body
                        ? body.error
                        : "Could not retry the calculation."
                );
            }

            const job = body as ProtocolJob;
            const historyItem = get().runHistory.find(
                (item) => item.jobId === jobId
            );

            if (historyItem) {
                get().upsertRunHistory({
                    ...historyItem,
                    status: job.status,
                    stage: job.stage,
                    queuePosition: job.queuePosition,
                    attempt: job.attempt,
                    error: undefined,
                    updatedAt: new Date().toISOString(),
                });
            }

            await saveActiveJobId(jobId);

            set({
                activeJob: job,
                loading: !isTerminalJob(job.status),
                error: null,
                data: null,
                formattedData: null,
            });

            await get().pollProtocolJob(jobId);
        } catch (error: any) {
            set({
                error: error.message || "Could not retry the calculation.",
            });
        }
    },

    cancelActiveJob: async () => {
        const jobId = get().activeJob?.jobId;
        if (jobId) await get().cancelJob(jobId);
    },

    retryActiveJob: async () => {
        const jobId = get().activeJob?.jobId;
        if (jobId) await get().retryJob(jobId);
    },

    resumeSavedJob: async () => {
        const jobId = await idbGet<string>(ACTIVE_PROTOCOL_JOB_STORAGE_KEY);

        if (!jobId || resumingJobIds.has(jobId)) {
            return;
        }

        resumingJobIds.add(jobId);

        try {
            await get().pollProtocolJob(jobId, {
                showInOutput: false,
            });
        } finally {
            resumingJobIds.delete(jobId);
        }
    },

    renameRunHistory: (id, name) => {
        const trimmedName = name.trim();

        if (!trimmedName) return;

        set((state) => {
            const next = state.runHistory.map((item) => {
                if (item.id !== id && item.jobId !== id) {
                    return item;
                }

                return {
                    ...item,
                    name: trimmedName,
                };
            });

            writeRunHistory(next);

            return {
                runHistory: next,
            };
        });
    },

    pollProtocolJob: async (
        jobId: string,
        options?: { showInOutput?: boolean }
    ) => {
        const showInOutput = options?.showInOutput ?? true;

        while (true) {
            try {
                const response = await fetch(
                    `${RUN_PROTOCOL_URL}/${jobId}`
                );

                const body = await response.json() as
                    | ProtocolJob
                    | { error?: string };

                if (!response.ok) {
                    throw new Error(
                        "error" in body
                            ? body.error
                            : "Could not check calculation status."
                    );
                }

                const protocolJob = body as ProtocolJob;

                const existingHistoryItem = get().runHistory.find(
                    (item) => item.jobId === protocolJob.jobId
                );

                if (existingHistoryItem) {
                    get().upsertRunHistory({
                        ...existingHistoryItem,
                        status: protocolJob.status,
                        stage: protocolJob.stage,
                        queuePosition: protocolJob.queuePosition,
                        attempt: protocolJob.attempt,
                        error: protocolJob.error,
                        updatedAt: new Date().toISOString(),
                    });
                }

                if (
                    showInOutput &&
                    get().activeJob &&
                    get().activeJob?.jobId !== jobId
                ) {
                    return;
                }

                if (showInOutput) {
                    set({
                        activeJob: protocolJob,
                        loading: !isTerminalJob(
                            protocolJob.status
                        ),
                    });
                }

                if (protocolJob.status === "completed") {
                    if (protocolJob.result) {
                        const result = protocolJob.result;
                        const formattedData = formatData(result);

                        const historyItem =
                            get().runHistory.find(
                                (item) =>
                                    item.jobId ===
                                    protocolJob.jobId
                            );

                        if (historyItem) {
                            const completedSettings: LastSettingsRan = {
                                ...historyItem.settings,
                                result: formattedData,
                            };

                            get().upsertRunHistory({
                                ...historyItem,
                                settings: completedSettings,
                                status: "completed",
                                stage: undefined,
                                queuePosition: undefined,
                                error: undefined,
                                updatedAt:
                                    new Date().toISOString(),
                            });

                            if (showInOutput) {
                                set({
                                    lastSettingsRan: completedSettings,
                                });
                            }
                        }

                        if (showInOutput) {
                            set({
                                cached: result._cached ?? false,
                                data: result,
                                formattedData,
                                loading: false,
                                error: null,
                            });
                        }
                    } else if (showInOutput) {
                        set({
                            loading: false,
                            error:
                                "The calculation completed but did not return a result.",
                        });
                    }

                    const activeJobId = await idbGet(ACTIVE_PROTOCOL_JOB_STORAGE_KEY);
                    if (activeJobId === jobId) {
                        await saveActiveJobId(null);
                    }

                    return;
                }

                if (
                    protocolJob.status === "failed" ||
                    protocolJob.status === "interrupted" ||
                    protocolJob.status === "timed_out"
                ) {
                    if (showInOutput) {
                        set({
                            activeJob: protocolJob,
                            error:
                                protocolJob.error ||
                                "The calculation failed.",
                            loading: false,
                        });
                    }

                    const activeJobId = await idbGet(ACTIVE_PROTOCOL_JOB_STORAGE_KEY);
                    if (activeJobId === jobId) {
                        await saveActiveJobId(null);
                    }

                    return;
                }

                if (protocolJob.status === "cancelled") {
                    if (showInOutput) {
                        set({
                            activeJob: protocolJob,
                            loading: false,
                        });
                    }

                    const activeJobId = await idbGet(ACTIVE_PROTOCOL_JOB_STORAGE_KEY);
                    if (activeJobId === jobId) {
                        await saveActiveJobId(null);
                    }

                    return;
                }
            } catch (error: unknown) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Could not check calculation status.";

                if (showInOutput) {
                    set({
                        error: message,
                        loading: false,
                    });
                } else {
                    console.error(
                        `Could not resume protocol job ${jobId}:`,
                        error
                    );
                }

                return;
            }

            await new Promise((resolve) =>
                setTimeout(resolve, POLL_INTERVAL_MS)
            );
        }
    },
    showHistoryResult: (item) => {
        const result = item.settings.result;

        if (
            (item.status ?? "completed") !== "completed" ||
            !result
        ) {
            return;
        }

        const jobId = item.jobId ?? item.id;

        set({
            formattedData: result,
            data: null,
            cached: false,
            error: null,
            loading: false,
            lastSettingsRan: item.settings,
            activeJob: {
                jobId,
                status: "completed",
                createdAt: item.savedAt,
                attempt: item.attempt ?? 1,
            },
        });
    },
    clearOutput: () => set({ data: null, formattedData: null, error: null, activeJob: null }),

}));