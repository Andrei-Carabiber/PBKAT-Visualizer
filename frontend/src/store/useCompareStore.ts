import { create } from "zustand";
import type { HistoryItem } from "@/store/runEngine";

interface CompareState {
    first: HistoryItem | null;
    second: HistoryItem | null;
    items: HistoryItem[];
    setItems: (items: HistoryItem[]) => void;
    setCompareItems: (first: HistoryItem, second: HistoryItem) => void;
    clearCompare: () => void;
}

export const useCompareStore = create<CompareState>((set) => ({
    first: null,
    second: null,
    items: [],
    setItems: (newItems) => set({items: newItems}),
    setCompareItems: (first, second) => set({ first, second }),
    clearCompare: () => set({ first: null, second: null }),
}));