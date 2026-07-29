import {create} from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {EdgeData, NodeData} from "@/components/main/node_editor/nodeEditor.tsx";


type GenericNodeData = Omit<NodeData, "nodeLabel">

interface customizationState {
    defaultNodeValues: GenericNodeData,
    defaultEdgeValues: EdgeData,
    setDefaultNodeValues: (newDefault: GenericNodeData) => void,
    setDefaultEdgeValues: (newDefault: EdgeData) => void,

    computeWernerQuality: boolean,
    setComputeWernerQuality: (bool: boolean) => void,

    showStatistics: boolean,
    setShowStatistics: (bool: boolean) => void

}

export const DEFAULT_NODE_VALUES : GenericNodeData = {
    coherence_time: 100,
    create_prob: 1,
    swap_prob: 1,
    create_quality: 1
}

export const DEFAULT_EDGE_VALUES : EdgeData = {
    distance: 100,
    transmit_prob: 1,
    uCreate_prob: 1,
    uCreate_quality: 1
}

export const useCustomization = create<customizationState>()(
    persist(
        (set) => ({
            defaultNodeValues: DEFAULT_NODE_VALUES,
            defaultEdgeValues: DEFAULT_EDGE_VALUES,

            setDefaultNodeValues: (newDefaultNodeValues) => { set({ defaultNodeValues: newDefaultNodeValues }); },
            setDefaultEdgeValues: (newDefaultEdgeValues) => { set({ defaultEdgeValues: newDefaultEdgeValues }); },

            computeWernerQuality: true,
            setComputeWernerQuality: (compute) => { set({ computeWernerQuality: compute }); },

            showStatistics: false,
            setShowStatistics: (show) => { set({ showStatistics: show }); }
        }),
        {
            name: "customization-storage",
            storage: createJSONStorage(() => localStorage),
        }
    )
);