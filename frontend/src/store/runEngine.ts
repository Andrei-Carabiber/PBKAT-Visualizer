import {create} from 'zustand';
import type {Node, Edge} from "@xyflow/react";
import type {NodeData, EdgeData} from "@/components/main/node_editor/nodeEditor.tsx";
import {isCodeValid, isCodeCorrect} from "@/components/main/text_editor/protocolParser.ts";
import {
    isQuantumCode,
} from "@/components/main/text_editor/haskellBoilerplate.ts";
import type {DataType} from "@/components/main/result_display/DataType.ts";
import {useCustomization} from "@/store/customization.ts";

export interface ActiveConnection {
    id: string;
    label: string;
}

interface RunEngineState {
    loading: boolean;
    data: DataType | null;
    error: string | null;
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
    truncation: number | string;
    coverage: number | string;
    setTruncation: (value: number | string) => void;
    setCoverage: (value: number | string) => void;

    // Editor and Graph
    registerEditor: (callback: () => string) => void;
    registerUserCodeGetter: (callback: () => string) => void;
    registerGraph: (callback: () => { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] }) => void;
    registerGraphSetter: (callback: (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => void) => void;
    registerUserCodeSetter: (callback: (code: string) => void) => void;
    handleRun: () => Promise<void>;
    clearOutput: () => void;
}

//State before editors loaded
interface PendingState {
    code: string;
    graph: { nodes: any[]; edges: any[] };
}

const RUN_PROTOCOL_URL = "/api/run-protocol";


export const useRunEngine = create<RunEngineState>((set, get) => ({
    loading: false,
    data: null,
    error: null,
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
    truncation: -1,
    coverage: -1,
    setTruncation: (truncation) => set({truncation}),
    setCoverage: (coverage) => set({coverage}),

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
            getCodeCallback, getGraphCallback, getUserCodeCallback, networkGoalDisabled,
            truncation, coverage,
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

        set({loading: true, error: null, data: null});

        if (fullCode) {
            const graphSnapshot = getGraphCallback?.() ?? {nodes: [], edges: []};
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

        // mdp/qmdp only: --coverage and --truncation are mutually exclusive
        // (mirrors resolveExtremalQuery in BellKAT.QuantumPrelude).
        if (truncation !== -1 && coverage !== -1 && mode === 'quantum') {
            set({
                error: "Use either --coverage or --truncation, not both.",
                loading: false,
            });
            return;
        }

        if (truncation === -1 && coverage === -1 && mode === 'quantum') {
            set({
                error: "You have to enable either truncation or coverage",
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
                truncation,
                coverage,
                probOnly: !computeWernerQuality
            }

            console.log(fullCode)
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

            const result = await response.json() as DataType;

            set({
                data: result,
                loading: false,
            });
        } catch (e: any) {
            set({error: e.message || "An error occurred.", loading: false});
        }
    },
    clearOutput: () => set({data: null, error: null}),
}));