import {create} from 'zustand';
import type {Node, Edge} from "@xyflow/react";
import type {NodeData, EdgeData} from "@/components/main/node_editor/nodeEditor.tsx";
import {isCodeValid} from "@/components/main/text_editor/protocolParser.ts";

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


    // Editor and Graph
    registerEditor: (callback: () => string) => void;
    registerUserCodeGetter: (callback: () => string) => void;
    registerGraph: (callback: () => { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] }) => void;
    handleRun: () => Promise<void>;
    clearOutput: () => void;
}

const RUN_PROTOCOL_URL = "http://localhost:8080/run-protocol";

export const useRunEngine = create<RunEngineState>((set, get) => ({
    loading: false,
    data: null,
    error: null,
    getCodeCallback: null,
    getUserCodeCallback: null,
    getGraphCallback: null,

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
    networkCapacityConnections: [{label: '"A" ~ "C"', id: crypto.randomUUID()},{label: '"C" ~ "C"', id: crypto.randomUUID()},{label: '"C" ~ "C"', id: crypto.randomUUID()},],
    setNetworkCapacityDisabled:(disabled) => set({networkCapacityDisabled: disabled}),
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

    handleRun: async () => {
        const {getCodeCallback, getGraphCallback, getUserCodeCallback, activeConnections, networkGoalDisabled} = get();
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
            const validation = isCodeValid(userRawCode, graphSnapshot.nodes, graphSnapshot.edges);

            if (!validation.valid) {
                set({
                    error: validation.error,
                    loading: false
                });
                return;
            }
        }

        try {
            const command = activeConnections.length === 0 || networkGoalDisabled ? "run" : "probability"
            const payload = {
                code: fullCode,
                command
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