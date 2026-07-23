import type {Edge, Node} from '@xyflow/react';
import type {NodeData, EdgeData} from '@/components/main/node_editor/nodeEditor.tsx';

export const EDITABLE_START_MARKER = '-- >>> EDITABLE REGION START >>>';
export const EDITABLE_END_MARKER = '-- <<< EDITABLE REGION END <<<';

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
    maxIterations: number = 0,
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

    const distances = edges
        .flatMap(e => {
            const src = nodes.find(n => n.id === e.source)?.data?.nodeLabel;
            const tgt = nodes.find(n => n.id === e.target)?.data?.nodeLabel;
            const dist = e.data?.distance ?? 0;
            return [
                `(("${src}", "${tgt}"), ${dist})`,
                `(("${tgt}", "${src}"), ${dist})`,
            ];
        }).join(", ");

    const isQuantum = userCode.includes("QBKATPolicy");


    let networkSetup = "";
    let mainInvocation = "";

    const policyOutput = maxIterations === 0 ? "outputGoal" : `(outputGoal ${maxIterations})`;

    console.log(maxIterations, policyOutput)
    if (isQuantum) {
        // Build NetworkBounds for Quantum execution
        const capacityDef = networkCapacity?.length === 0 ? "" :
            `networkCapacity :: NetworkCapacity QBKATTag
networkCapacity = [${networkCapacity}]

`;
        networkSetup = `${capacityDef}nb :: NetworkBounds QBKATTag
nb = def
    { nbCapacity = ${networkCapacity?.length === 0 ? "Nothing" : "Just networkCapacity"}
    , nbOperationTiming = InstantaneousOps
    }`;

        // qbkatMainD args: config, bounds, test, policy, initial_state
        mainInvocation = `main = qbkatMainD actionConfig nb goal ${policyOutput} mempty`;
    } else {
        // Build generic capacity for Probabilistic execution
        networkSetup = networkCapacity?.length === 0 ? "" :
            `networkCapacity :: NetworkCapacity BellKATTag
networkCapacity = [${networkCapacity}]`;

        // pbkatMain args: config, Maybe capacity, test, policy
        const capacityArg = networkCapacity?.length === 0 ? "Nothing" : "(Just networkCapacity)";
        mainInvocation = `main = pbkatMain actionConfig ${capacityArg} goal ${policyOutput}`;
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