import type {Edge, Node} from "@xyflow/react";
import type {EdgeData, NodeData} from "@/components/main/node_editor/nodeEditor.tsx";
import type {ActiveConnection} from "@/store/runEngine.ts";
import type {ProtocolCommand} from "@/components/main/text_editor/haskellBoilerplate.ts";

export type exampleSave = {
    id: string,
    name: string,
    code: string,
    graph: {
        nodes: Node<NodeData>[],
        edges: Edge<EdgeData>[],
    },
    goal: ActiveConnection[],
    goalDisabled: boolean,
    networkCapacity: ActiveConnection[],
    capacityDisabled: boolean,
    mode : ProtocolCommand
}