import type {Edge, Node} from '@xyflow/react';
import type {NodeData, EdgeData} from '@/components/main/node_editor/nodeEditor.tsx';

export const EDITABLE_START_MARKER = '-- >>> EDITABLE REGION START >>>';
export const EDITABLE_END_MARKER = '-- <<< EDITABLE REGION END <<<';

export const PRELUDE = `{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE OverloadedLists #-}

import BellKAT.Prelude
import BellKAT.ProbabilisticPrelude

${EDITABLE_START_MARKER}
`;

export function buildFullSource(
    userCode: string,
    nodes: Node<NodeData>[] = [],
    edges: Edge<EdgeData>[] = []
): string {

    const capacities = edges.map(e => {
        const sourceNode = nodes.find(n => n.id === e.source);
        const targetNode = nodes.find(n => n.id === e.target);
        const srcLabel = sourceNode?.data?.nodeLabel ?? 'Unknown';
        const tgtLabel = targetNode?.data?.nodeLabel ?? 'Unknown';
        return `"${srcLabel}" ~ "${tgtLabel}"`;
    }).join(", ");

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

    // 3. Parse Node parameters with runtime configuration fallbacks
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


    //TODO: Look at goal and networkCapacity. Clarify with TA

    // 4. Generate the dynamic suffix string
    const dynamicSuffix = `
${EDITABLE_END_MARKER}

-- networkCapacity :: NetworkCapacity BellKATTag
-- networkCapacity = [${capacities}]

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

goal :: ProbBellKATTest
goal = hasSubset ["A" ~ "C", "B" ~ "C"]

main :: IO ()
main = pbkatMain actionConfig Nothing goal p
`;

    return `${PRELUDE}\n${userCode}\n${dynamicSuffix}`;
}

export const DEFAULT_USER_CODE = `e :: ProbBellKATPolicy
e = create "C" <> trans "C" ("A", "C")

f :: ProbBellKATPolicy
f = create "C" <> trans "C" ("B", "C")

p :: ProbBellKATPolicy
p = (e <.> f) <> (e <.> f)
`;