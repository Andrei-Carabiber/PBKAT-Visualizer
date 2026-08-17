import type {DataType} from "@/components/main/result_display/DataType.ts";

const OUTER_OPEN = "⦅";
const OUTER_CLOSE = "⦆";
const SET_OPEN = "⦃";
const SET_CLOSE = "⦄";
const PROB_MARKER = "@()×";

type Term = {
    numerator: number;
    denominator: number;
};

type DistributionTerm = {
    key: string;
    label: string;
    term: Term;
};

type RangeRow = {
    key: string;
    label: string;
    first: Term;
    second: Term;
};

const splitTopLevel = (str: string, separator: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === SET_OPEN) depth++;
        else if (char === SET_CLOSE) depth--;
        else if (char === separator && depth === 0) {
            parts.push(str.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(str.slice(start));
    return parts;
};

const parseTerm = (rawTerm: string): DistributionTerm | null => {
    const trimmed = rawTerm.trim();
    if (!trimmed.startsWith(SET_OPEN)) return null;

    const setEnd = trimmed.indexOf(SET_CLOSE);
    if (setEnd === -1) return null;

    const setContent = trimmed.slice(SET_OPEN.length, setEnd).trim();
    const rest = trimmed.slice(setEnd + SET_CLOSE.length).trim();

    let numerator = 1;
    let denominator = 1;

    if (rest.startsWith(PROB_MARKER)) {
        const [numText, denomText] = rest.slice(PROB_MARKER.length).split("%");
        numerator = Number((numText ?? "0").trim());
        denominator = Number((denomText ?? "1").trim());
    }

    const label = setContent.length === 0
        ? "Empty state"
        : setContent.split(",").map((s) => s.trim()).join(", ");

    return {
        key: setContent,
        label,
        term: {numerator, denominator},
    };
};

const parseDistribution = (data: string): DistributionTerm[] => {
    if (!data.trim()) return [];
    return splitTopLevel(data, "+")
        .map(parseTerm)
        .filter((t): t is DistributionTerm => t !== null);
};

const alignIntervalRows = (lowerRaw: string, upperRaw: string): RangeRow[] => {
    const lowerTerms = parseDistribution(lowerRaw);
    const upperTerms = parseDistribution(upperRaw);

    const lowerMap = new Map(lowerTerms.map((t) => [t.key, t]));
    const upperMap = new Map(upperTerms.map((t) => [t.key, t]));

    const allKeys = Array.from(new Set([...lowerMap.keys(), ...upperMap.keys()]));

    return allKeys.map((key) => {
        const lower = lowerMap.get(key);
        const upper = upperMap.get(key);
        const defaultTerm: Term = {numerator: 0, denominator: 1};

        return {
            key,
            label: lower?.label ?? upper?.label ?? "Empty state",
            first: lower?.term ?? defaultTerm,
            second: upper?.term ?? defaultTerm,
        };
    });
};

export const formatData = (data: DataType): FormattedDataType => {

    if (data.mode !== 'probability' && data.mode !== "run") {
        const {_cached, ...dataWithoutCached} = data;

        return dataWithoutCached as FormattedDataType;
    }

    const message = data.output

    if (data.mode === 'probability') {
        const fractionMatch = message.slice(message.indexOf("(") + 1, message.indexOf(")"));
        const [lowerRaw, upperRaw] = splitTopLevel(fractionMatch, ",");

        const [lowerNum, lowerDenom] = (lowerRaw ?? "").split("%");
        const [upperNum, upperDenom] = (upperRaw ?? "").split("%");

        const lowerTerm: Term = {numerator: Number(lowerNum), denominator: Number(upperDenom ? lowerDenom : 1)};
        const upperTerm: Term = upperRaw
            ? {numerator: Number(upperNum), denominator: Number(upperDenom)}
            : lowerTerm;


        return {
            mode: "probability",
            probability: {
                lowerEnd: lowerTerm,
                higherEnd: upperTerm
            },
            durations: {
                firstDuration: data.durations.firstDuration,
                secondDuration: data.durations.secondDuration ?? 0
            }

        }
    }

    //run mode
    else {
        const inner = message.includes(OUTER_OPEN) && message.includes(OUTER_CLOSE)
            ? message.slice(message.indexOf(OUTER_OPEN) + 1, message.indexOf(OUTER_CLOSE))
            : message;

        const splitInterval = splitTopLevel(inner, ",");
        const isInterval = splitInterval.length > 1;

        if (isInterval) {
            const rows = alignIntervalRows(splitInterval[0], splitInterval[1]);

            return {
                mode: 'run',
                duration: data.durations.firstDuration,
                isInterval: isInterval,
                probability: rows
            }
        }

        else {
            return {
                mode: 'run',
                duration: data.durations.firstDuration,
                isInterval: isInterval,
                probability: parseDistribution(inner)
            }
        }


    }
}

export type FormattedDataType = QBKATProbQualityOutput | QBKATProbOutput | FormattedPBKATOutput;

type QBKATProbOutput = {
    mode: "probOnly",
    probabilityMax: number[],
    probabilityMin: number[],
    duration: number
}

type QBKATProbQualityOutput = {
    mode: "probQuality",

    probability: number[],
    wernerArray: number[],
    durations: {
        firstDuration: number
        secondDuration: number
    }
}

type FormattedPBKATOutput = FormattedPBKATProbability | FormattedPBKATRun;

type FormattedPBKATProbability = {
    mode: "probability";
    probability: {
        lowerEnd: Term;
        higherEnd: Term;
    }
    durations: {
        firstDuration: number
        secondDuration: number
    };
}


type FormattedPBKATRun = {
    mode: "run";
    duration: number;
    isInterval: boolean
    probability: RangeRow[] |  DistributionTerm[]
}