import {create} from 'zustand';
import type {Node, Edge} from "@xyflow/react";
import type {NodeData, EdgeData} from "@/components/main/node_editor/nodeEditor.tsx";
import {isCodeValid, isCodeCorrect} from "@/components/main/text_editor/protocolParser.ts";
import {
    isQuantumCode,
    type ProtocolCommand
} from "@/components/main/text_editor/haskellBoilerplate.ts";

export interface ActiveConnection {
    id: string;
    label: string;
}

interface RunEngineState {
    loading: boolean;
    data: string | null;
    error: string | null;
    // What the server actually ran, from its response — read this for
    // formatting decisions rather than re-deriving mode from the editor,
    // since the editor's code may have changed since this result came back.
    resultMode: "quantum" | "probabilistic" | null;
    resultCommand: string | null;
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
    selectedCommand: ProtocolCommand;
    pure: boolean;
    computeExtremal: boolean;
    dumpDp: boolean;
    truncation: number;
    coverage: number | string;
    setSelectedCommand: (command: ProtocolCommand) => void;
    setPure: (pure: boolean) => void;
    setComputeExtremal: (value: boolean) => void;
    setDumpDp: (value: boolean) => void;
    setTruncation: (value: number | undefined) => void;
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

const RUN_PROTOCOL_URL = "http://localhost:8080/run-protocol";

export const useRunEngine = create<RunEngineState>((set, get) => ({
    loading: false,
    data: null,
    error: null,
    resultMode: null,
    resultCommand: null,
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
    selectedCommand: 'run',
    pure: false,
    computeExtremal: true,
    dumpDp: false,
    truncation: -1,
    coverage: -1,
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

        set({loading: true, error: null, data: null, resultMode: null, resultCommand: null});

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
        const mode = quantum ? "quantum" : "probabilistic";

        // Which commands are actually legal for this code. This is stricter
        // than "quantum vs probabilistic": if ProbBellKATPolicy appears
        // anywhere in the code, mdp/qmdp are excluded even when QBKATPolicy
        // also appears, since a ProbBellKATPolicy value can't be passed where
        // qbkatMainD expects a QBKATPolicy.
        let allowedCommands: ProtocolCommand[];
        if (mode === "quantum") {
            allowedCommands = ['qmdp', 'mdp']
        } else {
            allowedCommands = ['run']
        }

        // If the user picked a command explicitly, make sure it's actually valid
        // for this code before we even hit the network.
        if (selectedCommand && !allowedCommands.includes(selectedCommand)) {
            set({
                error: `Mode "${selectedCommand === 'run' ? "Normal" : selectedCommand}" isn't available for this code.`,
                loading: false,
            });
            return;
        }

        // mdp/qmdp only: --coverage and --truncation are mutually exclusive
        // (mirrors resolveExtremalQuery in BellKAT.QuantumPrelude).
        if (truncation !== -1 && coverage !== -1 && mode === 'quantum') {
            set({
                error: "Use either --coverage or --truncation, not both.",
                loading: false,
            });
            return;
        }

        if (computeExtremal && truncation === -1 && coverage === -1 && mode === 'quantum') {
            set({
                error: "If you use Compute Extremal setting you have to enable either truncation or coverage",
                loading: false
            });
            return
        }

        const command: string = selectedCommand === 'run' ?
            (activeConnections.length === 0 || networkGoalDisabled ? "run" : "probability") : selectedCommand

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
                set({
                    error: body.error ?? `Request failed with status ${response.status}`,
                    resultMode: body.mode ?? null,
                    resultCommand: body.command ?? null,
                    loading: false,
                });
                return;
            }

            const result = await response.json();
            set({
                data: result.output,
                resultMode: result.mode ?? null,
                resultCommand: result.command ?? null,
                loading: false,
            });
        } catch (e: any) {
            set({error: e.message || "An error occurred.", loading: false});
        }
    },
    clearOutput: () => set({data: null, error: null, resultMode: null, resultCommand: null}),
}));