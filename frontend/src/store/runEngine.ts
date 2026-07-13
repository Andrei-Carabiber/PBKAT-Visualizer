import { create } from 'zustand';
import type {Node, Edge} from "@xyflow/react";
import type {NodeData, EdgeData} from "@/components/main/node_editor/nodeEditor.tsx";
import {isCodeValid} from "@/components/main/text_editor/protocolParser.ts";

interface RunEngineState {
    loading: boolean;
    data: string | null;
    error: string | null;
    getCodeCallback: (() => string) | null;
    getUserCodeCallback: (() => string) | null;
    getGraphCallback: (() => { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] }) | null;
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

    registerEditor: (callback) => set({ getCodeCallback: callback }),
    registerUserCodeGetter: (callback) => set({ getUserCodeCallback: callback }),
    registerGraph: (callback) => set({ getGraphCallback: callback }),

    handleRun: async () => {
        const { getCodeCallback, getGraphCallback } = get();
        if (!getCodeCallback) {
            set({
                error: "The code editor is still initializing language servers. Please wait a moment and try again. (Wait 10seconds)",
                loading: false
            });
            return;
        }

        const code = getCodeCallback();

        set({ loading: true, error: null, data: null });

        if (code) {
            const graphSnapshot = getGraphCallback ?.() ?? { nodes: [], edges: [] };

            const validation = isCodeValid(code, graphSnapshot.nodes, graphSnapshot.edges);

            // 3. Handle validation rejection cleanly
            if (!validation.valid) {
                set({
                    error: validation.error,
                    loading: false
                });
                return;
            }
        }

        try {
            const response = await fetch(RUN_PROTOCOL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, command: 'run' }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error ?? `Request failed with status ${response.status}`);
            }

            const result = await response.json();
            set({ data: result.output, loading: false });
        } catch (e: any) {
            set({ error: e.message || "An error occurred.", loading: false });
        }
    },
    clearOutput: () => set({ data: null, error: null }),
}));