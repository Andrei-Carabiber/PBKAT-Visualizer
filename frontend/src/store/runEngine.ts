import { create } from 'zustand';

interface RunEngineState {
    loading: boolean;
    data: string | null;
    error: string | null;
    // Holds the callback to get the latest editor code
    getCodeCallback: (() => string) | null;
    registerEditor: (callback: () => string) => void;
    handleRun: () => Promise<void>;
    clearOutput: () => void;
}

const RUN_PROTOCOL_URL = "http://localhost:8080/run-protocol";

export const useRunEngine = create<RunEngineState>((set, get) => ({
    loading: false,
    data: null,
    error: null,
    getCodeCallback: null,

    registerEditor: (callback) => set({ getCodeCallback: callback }),

    handleRun: async () => {
        console.log("Clicked run")
        const { getCodeCallback } = get();
        if (!getCodeCallback) {
            set({
                error: "The code editor is still initializing language servers. Please wait a moment and try again. (Wait 10seconds)",
                loading: false
            });
            return;
        }


        const code = getCodeCallback();
        set({ loading: true, error: null, data: null });
        console.log("Running the 'run' command in the 'run-protocol' directory, ")
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