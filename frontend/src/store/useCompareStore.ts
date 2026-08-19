import { create } from "zustand";
import type { HistoryItem } from "@/store/runEngine";

interface CompareState {
    first: HistoryItem | null;
    second: HistoryItem | null;
    setCompareItems: (first: HistoryItem, second: HistoryItem) => void;
    clearCompare: () => void;
}

export const useCompareStore = create<CompareState>((set) => ({
    first: null,
    second: null,
    setCompareItems: (first, second) => set({ first, second }),
    clearCompare: () => set({ first: null, second: null }),
}));