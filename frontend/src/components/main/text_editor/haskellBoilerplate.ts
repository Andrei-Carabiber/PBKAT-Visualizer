import type {Edge, Node} from '@xyflow/react';
import type {NodeData, EdgeData} from '@/components/main/node_editor/nodeEditor.tsx';
import { parseProtocolGraph } from "@/components/main/text_editor/protocolParser.ts"; // NEW

export const EDITABLE_START_MARKER = '-- >>> EDITABLE REGION START >>>';
export const EDITABLE_END_MARKER = '-- <<< EDITABLE REGION END <<<';


function keyOf(a: string, b: string) {
    return [a, b].sort().join("::");
}

function buildDistances(
    userCode: string,
    nodes: Node<NodeData>[],
    edges: Edge<EdgeData>[],
): Map<string, number> {
    const distanceMap = new Map<string, number>();

    for (const e of edges) {
        const src = nodes.find(n => n.id === e.source)?.data?.nodeLabel;
        const tgt = nodes.find(n => n.id === e.target)?.data?.nodeLabel;
        if (!src || !tgt) continue;
        distanceMap.set(keyOf(src, tgt), e.data?.distance ?? 0);
    }

    const {swapTriples} = parseProtocolGraph(userCode);
    if (swapTriples?.length) {
        // Loop a couple of passes so multi-hop swap chains resolve
        // regardless of the order they appear in the code.
        for (let pass = 0; pass < swapTriples.length; pass++) {
            for (const {pivot, a, b} of swapTriples) {
                const key = keyOf(a, b);
                if (distanceMap.has(key)) continue;
                const dPivotA = distanceMap.get(keyOf(pivot, a));
                const dPivotB = distanceMap.get(keyOf(pivot, b));
                if (dPivotA === undefined || dPivotB === undefined) continue;
                distanceMap.set(key, dPivotA + dPivotB);
            }
        }
    }

    return distanceMap;
}

export function isQuantumCode(userCode: string): boolean {
    return userCode.includes("QBKATPolicy");
}

export const EDITOR_PRELUDE_ALL_IMPORTS = `
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE OverloadedLists #-}

import BellKAT.Prelude
import BellKAT.ProbabilisticPrelude
import BellKAT.QuantumPrelude
${EDITABLE_START_MARKER}
`


export const PROBABILISTIC_PRELUDE = `
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE OverloadedLists #-}

import BellKAT.Prelude
import BellKAT.ProbabilisticPrelude
${EDITABLE_START_MARKER}
`;

export const QUANTUM_PRELUDE = `
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE OverloadedLists #-}

import BellKAT.QuantumPrelude
${EDITABLE_START_MARKER}
`;

export function buildFullSource(
    userCode: string,
    nodes: Node<NodeData>[] = [],
    edges: Edge<EdgeData>[] = [],
    networkCapacity: string[] = [],
    networkGoal: string[] = [],
    initialSave: boolean = false,
): string {


    const transmitProbs = edges
        .flatMap(e => {
            const src = nodes.find(n => n.id === e.source)?.data?.nodeLabel;
            const tgt = nodes.find(n => n.id === e.target)?.data?.nodeLabel;
            const prob = e.data?.transmit_prob ?? 1.0;
            return [
                `(("${src}", "${tgt}"), ${prob})`,
                `(("${tgt}", "${src}"), ${prob})`,
            ];
        }).join(", ");

    const createProbs = nodes
        .map(n => `("${n.data.nodeLabel}", ${n.data.create_prob ?? 1.0})`).join(", ");

    const createQualities = nodes
        .map(n => `("${n.data.nodeLabel}", ${n.data.create_quality ?? 1.0})`).join(", ");

    const uCreateProbs = edges
        .flatMap(e => {
            const src = nodes.find(n => n.id === e.source)?.data?.nodeLabel;
            const tgt = nodes.find(n => n.id === e.target)?.data?.nodeLabel;
            const prob = e.data?.uCreate_prob ?? 1.0;
            return [
                `(("${src}", "${tgt}"), ${prob})`,
                `(("${tgt}", "${src}"), ${prob})`,
            ];
        }).join(", ");

    const uCreateQualities = edges
        .flatMap(e => {
            const src = nodes.find(n => n.id === e.source)?.data?.nodeLabel;
            const tgt = nodes.find(n => n.id === e.target)?.data?.nodeLabel;
            const quality = e.data?.uCreate_quality ?? 1.0;
            return [
                `(("${src}", "${tgt}"), ${quality})`,
                `(("${tgt}", "${src}"), ${quality})`,
            ];
        }).join(", ");

    const swapProbs = nodes
        .map(n => `("${n.data.nodeLabel}", ${n.data.swap_prob ?? 1.0})`).join(", ");
    const coherenceTimes = nodes
        .map(n => `("${n.data.nodeLabel}", ${n.data.coherence_time ?? 1})`).join(", ");

    const distanceMap = buildDistances(userCode, nodes, edges);
    const distances = Array.from(distanceMap.entries())
        .flatMap(([key, dist]) => {
            const [a, b] = key.split("::");
            return [
                `(("${a}", "${b}"), ${dist})`,
                `(("${b}", "${a}"), ${dist})`,
            ];
        }).join(", ");

    const isQuantum = isQuantumCode(userCode);


    let networkSetup = "";
    let mainInvocation = "";

    if (isQuantum) {
        const capacityDef = networkCapacity?.length === 0 ? "" :
            `networkCapacity :: NetworkCapacity QBKATTag
networkCapacity = [${networkCapacity}]

`;
        networkSetup = `${capacityDef}nb :: NetworkBounds QBKATTag
nb = def
    { nbCapacity = ${networkCapacity?.length === 0 ? "Nothing" : "Just networkCapacity"}}`;

        // qbkatMainD args: config, bounds, test, policy, initial_state
        mainInvocation = `main = qbkatMainD actionConfig nb goal outputGoal mempty`;
    } else {
        // Build generic capacity for Probabilistic execution
        networkSetup = networkCapacity?.length === 0 ? "" :
            `networkCapacity :: NetworkCapacity BellKATTag
networkCapacity = [${networkCapacity}]`;

        // pbkatMain args: config, Maybe capacity, test, policy
        const capacityArg = networkCapacity?.length === 0 ? "Nothing" : "(Just networkCapacity)";
        mainInvocation = `main = pbkatMain actionConfig ${capacityArg} goal outputGoal`;
    }

    // 4. Generate the dynamic suffix string
    const dynamicSuffix = `
    
${EDITABLE_END_MARKER}

${networkSetup}

actionConfig :: ProbabilisticActionConfiguration
actionConfig = PAC
    { pacTransmitProbability = [${transmitProbs}]
    , pacCreateProbability = [${createProbs}]
    , pacCreateWerner = [${createQualities}]
    , pacUCreateProbability = [${uCreateProbs}]
    , pacUCreateWerner = [${uCreateQualities}]
    , pacSwapProbability = [${swapProbs}]
    , pacCoherenceTime = [${coherenceTimes}]
    , pacDistances = [${distances}]
    }

goal :: ${isQuantum ? "QBKATTest" : "ProbBellKATTest"}
goal = hasSubset [${networkGoal}]

main :: IO ()
${mainInvocation}
`;

    //Made for Haskell Language Server (Do not run this ever!)
    if (initialSave) {
        return `${EDITOR_PRELUDE_ALL_IMPORTS}\n${userCode}\n${dynamicSuffix}`;
    }

    if (isQuantum) {
        return `${QUANTUM_PRELUDE}\n${userCode}\n${dynamicSuffix}`;
    } else {
        return `${PROBABILISTIC_PRELUDE}\n${userCode}\n${dynamicSuffix}`;
    }
}

export const DEFAULT_USER_CODE = `e :: ProbBellKATPolicy
e = create "C" <> trans "C" ("A", "C")

f :: ProbBellKATPolicy
f = create "C" <> trans "C" ("B", "C")

outputGoal :: ProbBellKATPolicy
outputGoal = (e <||> f) <> (e <.> f)
`;