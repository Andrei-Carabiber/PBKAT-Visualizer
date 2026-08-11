import type {Edge, Node} from "@xyflow/react";

export type ParsedGraph = {
    nodeLabels: string[];
    edgePairs: [string, string][];
    generatedEdges?: [string, string][];
    swapTriples?: { pivot: string; a: string; b: string }[];
};



const STRING = `"([^"]+)"`;
const TUPLE2 = `\\(\\s*${STRING}\\s*,\\s*${STRING}\\s*\\)`;

type PatternConfig = {
    patternStr: string;
    extract: (m: RegExpMatchArray) => {
        nodes: string[];
        edges: [string, string][];
        generated_edges?: [string, string][];
        swap_triple?: { pivot: string; a: string; b: string };
    };
};
const PATTERNS: PatternConfig[] = [
    {
        patternStr: `\\bcreate\\s*${STRING}`,
        extract: (m) => ({nodes: [m[1]], edges: []}),
    },
    {
        patternStr: `\\btrans\\s*${STRING}\\s*${TUPLE2}`,
        extract: (m) => {
            const [x, y, z] = [m[1], m[2], m[3]];
            return {nodes: [x, y, z], edges: [[x, y], [x, z]]};
        },
    },
    {
        patternStr: `\\bswap\\s*${STRING}\\s*${TUPLE2}`,
        extract: (m) => {
            const [z, x, y] = [m[1], m[2], m[3]];
            return {
                nodes: [z, x, y],
                edges: [[z, x], [z, y]],
                generated_edges: [[x, y], [y, x]],
                swap_triple: {pivot: z, a: x, b: y},
            };
        },
    },
    {
        patternStr: `\\bdistill\\s*${TUPLE2}`,
        extract: (m) => ({nodes: [m[1], m[2]], edges: [[m[1], m[2]]]}),
    },
    {
        patternStr: `\\bucreate\\s*${TUPLE2}`,
        extract: (m) => ({nodes: [m[1], m[2]], edges: [[m[1], m[2]]]}),
    },
    {
        patternStr: `${STRING}\\s*~\\s*${STRING}`,
        extract: (m) => ({nodes: [m[1], m[2]], edges: [[m[1], m[2]]]}),
    },
];

function stripLineComments(code: string): string {
    return code
        .split('\n')
        .map((line) => {
            const idx = line.indexOf('--');
            return idx === -1 ? line : line.slice(0, idx);
        })
        .join('\n');
}

export function parseProtocolGraph(code: string): ParsedGraph {
    const cleaned = stripLineComments(code);
    const nodeSet = new Set<string>();
    const edgeMap = new Map<string, [string, string]>();
    const generatedEdges = [];
    const swapTriples: { pivot: string; a: string; b: string }[] = [];


    for (const {patternStr, extract} of PATTERNS) {
        const regex = new RegExp(patternStr, 'g');

        for (const m of cleaned.matchAll(regex)) {
            const {nodes, edges, generated_edges, swap_triple} = extract(m);
            if (generated_edges) {
                generatedEdges.push(...generated_edges.filter(([a, b]) => a !== b));
            }
            if (swap_triple && swap_triple.a !== swap_triple.b) {
                swapTriples.push(swap_triple);
            }
            nodes.forEach((n) => nodeSet.add(n));
            edges.forEach(([a, b]) => {
                if (a === b) return;
                const key = [a, b].sort((a, b) => a.localeCompare(b)).join('::');
                if (!edgeMap.has(key)) edgeMap.set(key, [a, b]);
            });
        }
    }

    return {
        nodeLabels: Array.from(nodeSet),
        edgePairs: Array.from(edgeMap.values()),
        generatedEdges: generatedEdges,
        swapTriples: swapTriples,
    };
}

export type ValidationResult =
    | { valid: true; nodeLabels: string[]; edgePairs: [string, string][] }
    | { valid: false; error: string };

export function isCodeValid(
    code: string,
    existingNodes: Node[],
    existingEdges: Edge[]
): ValidationResult {
    const {nodeLabels, edgePairs, generatedEdges} = parseProtocolGraph(code);


    //Check nodes
    const uiNodeLabels: string[] = existingNodes.map((node) => node.data.nodeLabel as string);
    const uiNodeSet = new Set(uiNodeLabels);

    for (const node of nodeLabels) {
        if (!uiNodeSet.has(node)) {
            return {
                valid: false,
                error: `Your code declares node "${node}", but it hasn't been placed on the canvas.`
            };
        }
    }

    //Validate Edges
    const nodeIdToLabelMap = new Map<string, string>(
        existingNodes.map((node) => [node.id, node.data.nodeLabel as string])
    );

    const uiEdgeKeys = new Set<string>();

    if (generatedEdges) {
        for (const [source, target] of generatedEdges) {
            const uiKey = [source, target].sort((a, b) => a.localeCompare(b)).join("::");
            uiEdgeKeys.add(uiKey)
        }
    }

    for (const edge of existingEdges) {
        const sourceLabel = nodeIdToLabelMap.get(edge.source);
        const targetLabel = nodeIdToLabelMap.get(edge.target);

        if (!sourceLabel || !targetLabel) continue;

        const uiKey = [sourceLabel, targetLabel].sort((a, b) => a.localeCompare(b)).join('::');
        uiEdgeKeys.add(uiKey);

    }
    for (const [a, b] of edgePairs) {
        const codeKey = [a, b].sort((a, b) => a.localeCompare(b)).join('::');
        if (!uiEdgeKeys.has(codeKey)) {
            return {
                valid: false,
                error: `Your code declares a connection between "${a}" and "${b}", but it hasn't been drawn on the canvas.`
            };
        }
    }

    return {
        valid: true,
        nodeLabels,
        edgePairs
    };
}


type CorrectionResult = {
    valid: boolean;
    error?: string;
}

//Check if code uses ProbBellKATPolicy or QBKATPolicy and if it has the output
export function isCodeCorrect(code: string): CorrectionResult {

    if (!code.includes("outputGoal")) {
        return {
            valid: false,
            error: "Your code has to include: 'outputGoal' as final variable"
        }
    }

    if (code.includes("QBKATPolicy") && code.includes("ProbBellKATPolicy")) {
        return {
            valid: false,
            error: "Your code cannot have both QBKAT and ProbBellKAT policies"
        }
    }

    if (!(code.includes("QBKATPolicy") || code.includes("ProbBellKATPolicy"))) {
        return {
            valid: false,
            error: "Your code cannot needs to declare at least one type of policy (ProbBellKATPolicy or QBKATPolicy)"
        }
    }


    return {valid: true}
}