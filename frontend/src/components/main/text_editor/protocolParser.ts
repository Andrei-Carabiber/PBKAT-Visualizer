import type {Edge, Node} from "@xyflow/react";

export type ParsedGraph = {
    nodeLabels: string[];
    edgePairs: [string, string][];
};

const STRING = `"([^"]+)"`;
const TUPLE2 = `\\(\\s*${STRING}\\s*,\\s*${STRING}\\s*\\)`;

type Extractor = {
    regex: RegExp;
    extract: (m: RegExpMatchArray) => { nodes: string[]; edges: [string, string][] };
};

const PATTERNS: Extractor[] = [
    {
        regex: new RegExp(`\\bcreate\\s*${STRING}`, 'g'),
        extract: (m) => ({nodes: [m[1]], edges: []}),
    },
    {
        regex: new RegExp(`\\btrans\\s*${STRING}\\s*${TUPLE2}`, 'g'),
        extract: (m) => {
            const [x, y, z] = [m[1], m[2], m[3]];
            return {nodes: [x, y, z], edges: [[x, y], [x, z]]};
        },
    },
    {
        regex: new RegExp(`\\bswap\\s*${STRING}\\s*${TUPLE2}`, 'g'),
        extract: (m) => {
            const [z, x, y] = [m[1], m[2], m[3]];
            return {nodes: [z, x, y], edges: [[z, x], [z, y]]};
        },
    },
    {
        regex: new RegExp(`\\bdistill\\s*${TUPLE2}`, 'g'),
        extract: (m) => ({nodes: [m[1], m[2]], edges: [[m[1], m[2]]]}),
    },
    {
        regex: new RegExp(`\\bucreate\\s*${TUPLE2}`, 'g'),
        extract: (m) => ({nodes: [m[1], m[2]], edges: [[m[1], m[2]]]}),
    },
    {
        regex: new RegExp(`${STRING}\\s*~\\s*${STRING}`, 'g'),
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

    for (const {regex, extract} of PATTERNS) {
        for (const m of cleaned.matchAll(regex)) {
            const {nodes, edges} = extract(m);
            nodes.forEach((n) => nodeSet.add(n));
            edges.forEach(([a, b]) => {
                if (a === b) return;
                const key = [a, b].sort().join('::');
                if (!edgeMap.has(key)) edgeMap.set(key, [a, b]);
            });
        }
    }

    return {
        nodeLabels: Array.from(nodeSet),
        edgePairs: Array.from(edgeMap.values()),
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
    const { nodeLabels, edgePairs } = parseProtocolGraph(code);

    //Validate nodes
    const stringNodes: string[] = existingNodes.map((node) => node.data.nodeLabel as string);

    for (const node of stringNodes) {
        if (!nodeLabels.includes(node)) {
            return {
                valid: false,
                error: `Node "${node}" exists on the canvas but is missing from your code.`
            };
        }
    }

    //Validate Edges
    const codeEdgeKeys = new Set(
        edgePairs.map(([a, b]) => [a, b].sort().join('::'))
    );

    const nodeIdToLabelMap = new Map<string, string>(
        existingNodes.map((node) => [node.id, node.data.nodeLabel as string])
    );

    const uiEdgeKeys = new Set<string>();

    for (const edge of existingEdges) {
        const sourceLabel = nodeIdToLabelMap.get(edge.source);
        const targetLabel = nodeIdToLabelMap.get(edge.target);

        if (!sourceLabel || !targetLabel) continue;

        const uiKey = [sourceLabel, targetLabel].sort().join('::');
        uiEdgeKeys.add(uiKey);

        if (!codeEdgeKeys.has(uiKey)) {
            return {
                valid: false,
                error: `The connection between "${sourceLabel}" and "${targetLabel}" is drawn on the canvas but missing from your code.`
            };
        }
    }

    for (const [a, b] of edgePairs) {
        const codeKey = [a, b].sort().join('::');
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