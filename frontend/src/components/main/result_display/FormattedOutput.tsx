import { useRunEngine } from "@/store/runEngine.ts";
import type { PBKATOutput } from "@/components/main/result_display/DataType.ts";

type OutputProps = {
    data: PBKATOutput;
    estimatedMode: boolean;
};

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

// --- Robust Utilities ---

/**
 * Splits a string by a separator only when outside nested brackets ⦃...⦄
 */
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

    let numerator = 0;
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
        term: { numerator, denominator },
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
        const defaultTerm: Term = { numerator: 0, denominator: 1 };

        return {
            key,
            label: lower?.label ?? upper?.label ?? "Empty state",
            first: lower?.term ?? defaultTerm,
            second: upper?.term ?? defaultTerm,
        };
    });
};

const estimatedPercent = (t: Term): string => {
    if (!t || isNaN(t.numerator) || !t.denominator) return "0.000";
    return ((t.numerator / t.denominator) * 100).toFixed(3);
};

// --- UI Subcomponents ---

const Fraction = ({ numerator, denominator }: { numerator: string | number; denominator: string | number }) => (
    <span className="inline-flex flex-col items-center justify-center align-middle mx-1 text-sm">
    <span className="px-1 text-[13px] lg:text-[16px] leading-none">{numerator}</span>
    <span className="w-full h-px bg-foreground/60 my-0.5" />
    <span className="px-1 text-[13px] lg:text-[16px] leading-none">{denominator}</span>
  </span>
);

const RowShell = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 py-1 border-b last:border-0 border-muted/50 text-sm">
        {children}
    </div>
);

const EmptyState = () => (
    <div className="text-sm text-muted-foreground py-1">No connections could have been formed</div>
);

// --- Main Component ---

const FormattedOutput = ({ data, estimatedMode }: OutputProps) => {
    const { goalConnections } = useRunEngine();

    if (!data || !data.output) {
        return (
            <div className="flex flex-col gap-2 bg-background p-4 rounded-lg border shadow-inner">
                <EmptyState />
            </div>
        );
    }

    const { output: message, mode } = data;

    // Single Probability Goal Mode
    if (mode === "probability") {
        const fractionMatch = message.slice(message.indexOf("(") + 1, message.indexOf(")"));
        const [lowerRaw, upperRaw] = splitTopLevel(fractionMatch, ",");

        const [lowerNum, lowerDenom] = (lowerRaw ?? "").split("%");
        const [upperNum, upperDenom] = (upperRaw ?? "").split("%");

        const lowerTerm: Term = { numerator: Number(lowerNum), denominator: Number(upperDenom ? lowerDenom : 1) };
        const upperTerm: Term = upperRaw
            ? { numerator: Number(upperNum), denominator: Number(upperDenom) }
            : lowerTerm;

        const isExact = lowerTerm.numerator === upperTerm.numerator && lowerTerm.denominator === upperTerm.denominator;

        return (
            <div className="flex flex-col gap-2 bg-background p-4 rounded-lg border shadow-inner">
                <p>
                    The probability of achieving your Network goal (
                    {goalConnections.map((conn, idx) => (
                        <span key={conn.id}>
              {conn.label}
                            {idx === goalConnections.length - 1 ? "" : ", "}
            </span>
                    ))}) is:
                </p>

                {estimatedMode ? (
                    <div className="flex gap-3 text-primary font-bold">
                        <p>{estimatedPercent(lowerTerm)}%</p>
                        {!isExact && (
                            <>
                                <span>-</span>
                                <p>{estimatedPercent(upperTerm)}%</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-3 font-bold">
                        <Fraction numerator={lowerTerm.numerator} denominator={lowerTerm.denominator} />
                        {!isExact && (
                            <>
                                <span>-</span>
                                <Fraction numerator={upperTerm.numerator} denominator={upperTerm.denominator} />
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Full Run Mode
    if (mode === "run") {
        const inner = message.includes(OUTER_OPEN) && message.includes(OUTER_CLOSE)
            ? message.slice(message.indexOf(OUTER_OPEN) + 1, message.indexOf(OUTER_CLOSE))
            : message;

        const splitInterval = splitTopLevel(inner, ",");
        const isInterval = splitInterval.length > 1;

        if (isInterval) {
            const rows = alignIntervalRows(splitInterval[0], splitInterval[1]);

            if (rows.length === 0) {
                return (
                    <div className="flex flex-col gap-2 bg-background p-4 rounded-lg border shadow-inner">
                        <EmptyState />
                    </div>
                );
            }

            return (
                <div className="flex flex-col gap-2 bg-background p-4 rounded-lg border shadow-inner">
                    {rows.map((row) => (
                        <RowShell key={row.key}>
                            <span className="text-muted-foreground">Connection:</span>
                            <span className="font-semibold bg-muted px-2 py-0.5 rounded text-xs">{row.label}</span>
                            <span className="text-muted-foreground">|</span>
                            {estimatedMode ? (
                                <>
                                    <span className="text-muted-foreground">Estimated Probability Range:</span>
                                    <span className="font-bold text-primary">{estimatedPercent(row.first)}%</span>
                                    <span className="text-muted-foreground">-</span>
                                    <span className="font-bold text-primary">{estimatedPercent(row.second)}%</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-muted-foreground">Probability Range:</span>
                                    <Fraction numerator={row.first.numerator} denominator={row.first.denominator} />
                                    <span className="text-muted-foreground">-</span>
                                    <Fraction numerator={row.second.numerator} denominator={row.second.denominator} />
                                </>
                            )}
                        </RowShell>
                    ))}
                </div>
            );
        }

        // Single term run output (no interval)
        const singleTerms = parseDistribution(inner);
        if (singleTerms.length === 0) {
            return (
                <div className="flex flex-col gap-2 bg-background p-4 rounded-lg border shadow-inner">
                    <EmptyState />
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-2 bg-background p-4 rounded-lg border shadow-inner">
                {singleTerms.map(({ key, label, term }) => (
                    <RowShell key={key}>
                        <span className="text-muted-foreground">Connection:</span>
                        <span className="font-semibold bg-muted px-2 py-0.5 rounded text-xs">{label}</span>
                        <span className="text-muted-foreground">|</span>
                        {estimatedMode ? (
                            <>
                                <span className="text-muted-foreground">Estimated Probability:</span>
                                <span className="font-bold text-primary">{estimatedPercent(term)}%</span>
                            </>
                        ) : (
                            <>
                                <span className="text-muted-foreground">Probability:</span>
                                <Fraction numerator={term.numerator} denominator={term.denominator} />
                            </>
                        )}
                    </RowShell>
                ))}
            </div>
        );
    }

    return null;
};

export default FormattedOutput;