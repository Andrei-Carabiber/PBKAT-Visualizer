import {create} from 'zustand';
import type {Node, Edge} from "@xyflow/react";
import type {NodeData, EdgeData} from "@/components/main/node_editor/nodeEditor.tsx";
import {isCodeValid, isCodeCorrect} from "@/components/main/text_editor/protocolParser.ts";
import {isQuantumCode, commandsForMode, type ProtocolCommand} from "@/components/main/text_editor/haskellBoilerplate.ts";

export interface ActiveConnection {
    id: string;
    label: string;
}

interface RunEngineState {
    loading: boolean;
    data: string | null;
    error: string | null;
    getCodeCallback: (() => string) | null;
    getUserCodeCallback: (() => string) | null;
    getGraphCallback: (() => { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] }) | null;
    setGraphCallback: ((nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => void) | null;
    setUserCodeCallback: ((code: string) => void) | null;

    // Network Goal
    networkGoalDisabled: boolean;
    activeConnections: ActiveConnection[];
    setNetworkGoalDisabled: (disabled: boolean) => void;
    setActiveConnections: (connections: ActiveConnection[] | ((prev: ActiveConnection[]) => ActiveConnection[])) => void;

    // Network Capacity
    networkCapacityDisabled: boolean;
    networkCapacityConnections: ActiveConnection[];
    setNetworkCapacityDisabled: (disabled: boolean) => void;
    setNetworkCapacityConnections: (connections: ActiveConnection[] | ((prev: ActiveConnection[]) => ActiveConnection[])) => void;

    //State before loading
    pendingSharedState: PendingState | null;
    setPendingSharedState: (state: PendingState | null) => void;

    // Run mode / command selection
    // null = auto-pick a sensible default for the current mode (see handleRun)
    selectedCommand: ProtocolCommand | null;
    pure: boolean;
    computeExtremal: boolean;
    dumpDp: boolean;
    truncation: number | undefined;
    coverage: number | undefined;
    setSelectedCommand: (command: ProtocolCommand | null) => void;
    setPure: (pure: boolean) => void;
    setComputeExtremal: (value: boolean) => void;
    setDumpDp: (value: boolean) => void;
    setTruncation: (value: number | undefined) => void;
    setCoverage: (value: number | undefined) => void;

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

const RUN_PROTOCOL_URL = "http://localhost:8080/run-protocol";

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
    selectedCommand: null,
    pure: false,
    computeExtremal: false,
    dumpDp: false,
    truncation: undefined,
    coverage: undefined,
    setSelectedCommand: (selectedCommand) => set({selectedCommand}),
    setPure: (pure) => set({pure}),
    setComputeExtremal: (computeExtremal) => set({computeExtremal}),
    setDumpDp: (dumpDp) => set({dumpDp}),
    setTruncation: (truncation) => set({truncation}),
    setCoverage: (coverage) => set({coverage}),

    //NetworkGoal state
    networkGoalDisabled: false,
    activeConnections: [{label: '"A" ~ "C"', id: crypto.randomUUID(),}],
    setNetworkGoalDisabled: (disabled) => set({networkGoalDisabled: disabled}),
    setActiveConnections: (updater) => {
        if (typeof updater === 'function') {
            set((state) => ({activeConnections: updater(state.activeConnections)}));
        } else {
            set({activeConnections: updater});
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
            getCodeCallback, getGraphCallback, getUserCodeCallback,
            activeConnections, networkGoalDisabled,
            selectedCommand, pure, computeExtremal, dumpDp, truncation, coverage,
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

        console.log(fullCode)

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

        // Detect mode from the user's own code (matches buildFullSource's check)
        // rather than re-deciding independently, so the mode sent to the backend
        // can never drift from the mode the Haskell was actually generated for.
        const quantum = isQuantumCode(userRawCode);
        const mode = quantum ? "quantum" : "probabilistic";

        // If the user picked a command explicitly, make sure it's actually valid
        // for this mode (e.g. "mdp"/"qmdp" only exist in quantum mode) before we
        // even hit the network.
        const allowedCommands = commandsForMode(quantum);
        if (selectedCommand && !allowedCommands.includes(selectedCommand)) {
            set({
                error: `Command "${selectedCommand}" isn't available in ${mode} mode. Available commands: ${allowedCommands.join(", ")}.`,
                loading: false,
            });
            return;
        }

        // mdp/qmdp only: --coverage and --truncation are mutually exclusive
        // (mirrors resolveExtremalQuery in BellKAT.QuantumPrelude).
        if (truncation !== undefined && coverage !== undefined) {
            set({
                error: "Use either --coverage or --truncation, not both.",
                loading: false,
            });
            return;
        }

        const command: string = selectedCommand ?? (
            quantum
                ? "qmdp"
                : (activeConnections.length === 0 || networkGoalDisabled ? "run" : "probability")
        );

        try {
            const payload = {
                code: fullCode,
                mode,
                command,
                pure,
                computeExtremal,
                dumpDp,
                truncation,
                coverage,
            }
            const response = await fetch(RUN_PROTOCOL_URL, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error ?? `Request failed with status ${response.status}`);
            }

            const result = await response.json();
            set({data: result.output, loading: false});
        } catch (e: any) {
            set({error: e.message || "An error occurred.", loading: false});
        }
    },
    clearOutput: () => set({data: null, error: null}),
}));