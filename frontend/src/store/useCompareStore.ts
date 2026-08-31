import { create } from "zustand";
import type { HistoryItem } from "@/store/runEngine";

interface CompareState {
    items: HistoryItem[];
    setItems: (items: HistoryItem[]) => void;
    clearCompare: () => void;
}

export const useCompareStore = create<CompareState>((set) => ({
    items: [],
    setItems: (newItems) => set({items: newItems}),
    clearCompare: () => set({ items: [] }),
}));