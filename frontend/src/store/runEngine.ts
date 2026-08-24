import {create} from 'zustand';
import type {Node, Edge} from "@xyflow/react";
import type {NodeData, EdgeData} from "@/components/main/node_editor/nodeEditor.tsx";
import {isCodeValid, isCodeCorrect} from "@/components/main/text_editor/protocolParser.ts";
import {
    isQuantumCode,
} from "@/components/main/text_editor/haskellBoilerplate.ts";
import type {DataType} from "@/components/main/result_display/DataType.ts";
import {useCustomization} from "@/store/customization.ts";
import {formatData, type FormattedDataType} from "@/store/formatData.ts";

export interface ActiveConnection {
    id: string;
    label: string;
}

//Used for comparison
export type LastSettingsRan = {
    id: string;
    code: string;
    graph: { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] };
    goal: ActiveConnection[];
    goalDisabled: boolean;
    networkCapacity: ActiveConnection[];
    capacityDisabled: boolean;
    result: FormattedDataType;
    dateWhenRan: number;
};

export interface HistoryItem {
    id: string;
    name: string;
    settings: LastSettingsRan;
    savedAt: string;
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

    // Network Goal
    networkGoalDisabled: boolean;
    goalConnections: ActiveConnection[];
    setNetworkGoalDisabled: (disabled: boolean) => void;
    setGoalConnections: (connections: ActiveConnection[] | ((prev: ActiveConnection[]) => ActiveConnection[])) => void;

    // Network Capacity
    networkCapacityDisabled: boolean;
    networkCapacityConnections: ActiveConnection[];
    setNetworkCapacityDisabled: (disabled: boolean) => void;
    setNetworkCapacityConnections: (connections: ActiveConnection[] | ((prev: ActiveConnection[]) => ActiveConnection[])) => void;

    //State before loading
    pendingSharedState: PendingState | null;
    setPendingSharedState: (state: PendingState | null) => void;

    // Run mode / command selection
    truncation: number;
    coverage: number;
    setTruncation: (value: number) => void;
    setCoverage: (value: number) => void;
    truncationActive: boolean;
    setTruncationActive: (value:boolean) => void;

    // Editor and Graph
    registerEditor: (callback: () => string) => void;
    registerUserCodeGetter: (callback: () => string) => void;
    registerGraph: (callback: () => { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] }) => void;
    registerGraphSetter: (callback: (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => void) => void;
    registerUserCodeSetter: (callback: (code: string) => void) => void;
    handleRun: () => Promise<void>;
    cancelActiveJob: () => Promise<void>;
    retryActiveJob: () => Promise<void>;
    resumeSavedJob: () => Promise<void>;
    pollProtocolJob: (jobId: string, runContext?: {
        userRawCode: string;
        graphSnapshot: { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] };
        networkGoalDisabled: boolean;
    }) => Promise<void>;
    clearOutput: () => void;


    viewMode: "protocol" | "node"
    setViewMode: (viewMode: "protocol" | "node") => void;
}

//State before editors loaded
interface PendingState {
    code: string;
    graph: { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] };
}

const RUN_PROTOCOL_URL = "/api/run-protocol";
const ACTIVE_PROTOCOL_JOB_STORAGE_KEY = "active-protocol-job";
const POLL_INTERVAL_MS = 2_000;

const terminalJobStatuses: ProtocolJobStatus[] = ["completed", "failed", "cancelled", "interrupted", "timed_out"];

function isTerminalJob(status: ProtocolJobStatus): boolean {
    return terminalJobStatuses.includes(status);
}

function saveActiveJobId(jobId: string | null): void {
    if (jobId) localStorage.setItem(ACTIVE_PROTOCOL_JOB_STORAGE_KEY, jobId);
    else localStorage.removeItem(ACTIVE_PROTOCOL_JOB_STORAGE_KEY);
}

export const useRunEngine = create<RunEngineState>((set, get) => ({
    viewMode: 'protocol',
    setViewMode: (viewMode => {set({viewMode})}),
    loading: false,
    data: null,
    formattedData: null,
    lastSettingsRan: null,
    setLastSettingsRan: (newSettings) => {set({lastSettingsRan: newSettings})},
    cached: false,
    error: null,
    activeJob: null,
    getCodeCallback: null,
    getUserCodeCallback: null,
    setGraphCallback: null,
    setUserCodeCallback: null,
    getGraphCallback: null,

    //State before load
    pendingSharedState: null,
    setPendingSharedState: (pendingSharedState) => {
        set({pendingSharedState})
    },

    // Run mode / command selection
    truncation: 100,
    coverage: 0.99,
    setTruncation: (truncation) => set({truncation}),
    setCoverage: (coverage) => set({coverage}),
    truncationActive: true,
    setTruncationActive: (bool) => set({truncationActive: bool}),

    //NetworkGoal state
    networkGoalDisabled: false,
    goalConnections: [{label: '"A" ~ "C"', id: crypto.randomUUID(),}],
    setNetworkGoalDisabled: (disabled) => set({networkGoalDisabled: disabled}),
    setGoalConnections: (updater) => {
        if (typeof updater === 'function') {
            set((state) => ({goalConnections: updater(state.goalConnections)}));
        } else {
            set({goalConnections: updater});
        }
    },

    //Network capacity state
    networkCapacityDisabled: false,
    networkCapacityConnections: [{label: '"A" ~ "C"', id: crypto.randomUUID()}, {
        label: '"C" ~ "C"',
        id: crypto.randomUUID()
    }, {label: '"C" ~ "C"', id: crypto.randomUUID()},],
    setNetworkCapacityDisabled: (disabled) => set({networkCapacityDisabled: disabled}),
    setNetworkCapacityConnections: (updater) => {
        if (typeof updater === 'function') {
            set((state) => ({networkCapacityConnections: updater(state.networkCapacityConnections)}));
        } else {
            set({networkCapacityConnections: updater});
        }
    },

    registerEditor: (callback) => set({getCodeCallback: callback}),
    registerUserCodeGetter: (callback) => set({getUserCodeCallback: callback}),
    registerGraph: (callback) => set({getGraphCallback: callback}),
    registerGraphSetter: (callback) => {
        set({setGraphCallback: callback})
        const pending = get().pendingSharedState;
        if (pending?.graph) {
            callback(pending.graph.nodes, pending.graph.edges);
            if (get().setUserCodeCallback) set({pendingSharedState: null});
        }
    },
    registerUserCodeSetter: (callback) => {
        set({setUserCodeCallback: callback});
        const pending = get().pendingSharedState;
        if (pending?.code) {
            callback(pending.code);
            if (get().setGraphCallback) set({pendingSharedState: null});
        }
    },

    handleRun: async () => {
        const {
            getCodeCallback, getGraphCallback, getUserCodeCallback, networkGoalDisabled, goalConnections,
            truncation, coverage, truncationActive
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
        const graphSnapshot = getGraphCallback?.() ?? {nodes: [], edges: []};

        set({loading: true, error: null, data: null, formattedData:null});

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

        // Detect mode from the user's own code (matches buildFullSSource's check)
        // rather than re-deciding independently, so the mode sent to the backend
        // can never drift from the mode the Haskell was actually generated for.
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
                coverage : truncationActive ? -1 : coverage,
                probOnly: !computeWernerQuality
            }

            const response = await fetch(RUN_PROTOCOL_URL, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
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
            saveActiveJobId(job.jobId);
            set({ activeJob: job, loading: !isTerminalJob(job.status) });
            await get().pollProtocolJob(job.jobId, {
                userRawCode,
                graphSnapshot,
                networkGoalDisabled,
            });

        } catch (e: any) {
            set({error: e.message || "An error occurred.", loading: false});
        }
    },
    cancelActiveJob: async () => {
        const jobId = get().activeJob?.jobId;
        if (!jobId) return;

        try {
            const response = await fetch(`${RUN_PROTOCOL_URL}/${jobId}`, { method: "DELETE" });
            const job = await response.json() as ProtocolJob | { error?: string };
            if (!response.ok) throw new Error("error" in job ? job.error : "Could not cancel the calculation.");
            set({ activeJob: null, loading: false });
        } catch (error: any) {
            set({ error: error.message || "Could not cancel the calculation." });
        }
    },
    retryActiveJob: async () => {
        const jobId = get().activeJob?.jobId;
        if (!jobId) return;

        try {
            const response = await fetch(`${RUN_PROTOCOL_URL}/${jobId}/retry`, { method: "POST" });
            const job = await response.json() as ProtocolJob | { error?: string };
            if (!response.ok) throw new Error("error" in job ? job.error : "Could not retry the calculation.");
            saveActiveJobId(jobId);
            set({ activeJob: job as ProtocolJob, loading: true, error: null, data: null, formattedData: null });
            await get().pollProtocolJob(jobId);
        } catch (error: any) {
            set({ error: error.message || "Could not retry the calculation." });
        }
    },
    resumeSavedJob: async () => {
        const jobId = localStorage.getItem(ACTIVE_PROTOCOL_JOB_STORAGE_KEY);
        if (!jobId || get().activeJob) return;
        await get().pollProtocolJob(jobId);
    },
    pollProtocolJob: async (jobId: string, runContext?: {
        userRawCode: string;
        graphSnapshot: { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] };
        networkGoalDisabled: boolean;
    }) => {
        while (true) {
            try {
                const response = await fetch(`${RUN_PROTOCOL_URL}/${jobId}`);
                const job = await response.json() as ProtocolJob | { error?: string };
                if (!response.ok) throw new Error("error" in job ? job.error : "Could not check calculation status.");
                const protocolJob = job as ProtocolJob;

                if (get().activeJob && get().activeJob?.jobId !== jobId) return;
                set({ activeJob: protocolJob, loading: !isTerminalJob(protocolJob.status) });

                if (protocolJob.status === "completed" && protocolJob.result) {
                    const result = protocolJob.result;
                    const formattedData = formatData(result);
                    set({
                        cached: result._cached ?? false,
                        data: result,
                        formattedData,
                        loading: false,
                    });

                    if (runContext && get().getGraphCallback) {
                        const runId = crypto.randomUUID();
                        const lastSettingsRan: LastSettingsRan = {
                            id: runId,
                            code: runContext.userRawCode,
                            graph: runContext.graphSnapshot,
                            capacityDisabled: get().networkCapacityDisabled,
                            networkCapacity: get().networkCapacityConnections,
                            goal: get().goalConnections,
                            goalDisabled: runContext.networkGoalDisabled,
                            result: formattedData,
                            dateWhenRan: Date.now(),
                        };

                        try {
                            const rawHistory = localStorage.getItem("history");
                            const historyArray: HistoryItem[] = rawHistory ? JSON.parse(rawHistory) : [];
                            historyArray.push({
                                id: runId,
                                name: "Untitled",
                                settings: lastSettingsRan,
                                savedAt: new Date().toISOString(),
                            });
                            localStorage.setItem("history", JSON.stringify(historyArray));
                        } catch (storageError) {
                            console.error("Failed to write history to localStorage:", storageError);
                        }
                        set({ lastSettingsRan });
                    }

                    return;
                }

                if (protocolJob.status === "failed" || protocolJob.status === "interrupted" || protocolJob.status === "timed_out") {
                    set({ error: protocolJob.error || "The calculation failed.", loading: false });
                    return;
                }

                if (protocolJob.status === "cancelled") {
                    set({activeJob: null, loading: false });
                    return;
                }
            } catch (error: any) {
                set({ error: error.message || "Could not check calculation status.", loading: false });
                return;
            }

            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
    },
    clearOutput: () => set({data: null, formattedData: null, error: null, activeJob: null}),
}));
