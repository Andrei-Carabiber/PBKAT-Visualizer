type OutputProps = {
    data: string;
    estimatedMode: boolean;
};

// ---- Grammar tokens ------------------------------------------------------
// ⦅ ... ⦆        outer wrapper around the whole result
// ⦃ ... ⦄        a connection set, e.g. "A~C,B~C" (comma-separated, possibly empty)
// +              separates terms within one distribution
// @()×           separates a connection set from its probability
// NUM % DENOM    a fraction, e.g. "969 % 40000"
// ,  (top level) separates the two bounds of an interval result
const OUTER_OPEN = "⦅";
const OUTER_CLOSE = "⦆";
const SET_OPEN = "⦃";
const SET_CLOSE = "⦄";
const PROB_MARKER = "@()×";

/**
 * Splits `str` on `separator`, but only where we are NOT inside a ⦃...⦄ set.
 * This is what lets us safely split on "+" or "," without being fooled by
 * commas that belong to a connection set like "A~C,B~C".
 */
const splitTopLevel = (str: string, separator: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === SET_OPEN) {
            depth++;
        } else if (char === SET_CLOSE) {
            depth--;
        } else if (char === separator && depth === 0) {
            parts.push(str.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(str.slice(start));
    return parts;
};

const stripOuterBrackets = (data: string): string => {
    if (data.startsWith(OUTER_OPEN) && data.endsWith(OUTER_CLOSE)) {
        return data.slice(OUTER_OPEN.length, data.length - OUTER_CLOSE.length);
    }
    return data;
};

const isIntervalResult = (data: string): boolean => splitTopLevel(data, ",").length > 1;

type Term = {
    key: string;
    label: string;
    numerator: number;
    denominator: number;
};

const parseTerm = (term: string): Term | null => {
    if (!term.startsWith(SET_OPEN)) return null;

    const setEnd = term.indexOf(SET_CLOSE);
    if (setEnd === -1) return null;

    const setContent = term.slice(SET_OPEN.length, setEnd).trim();
    const rest = term.slice(setEnd + SET_CLOSE.length);
    if (!rest.startsWith(PROB_MARKER)) return null;

    const [numText, denomText] = rest.slice(PROB_MARKER.length).split("%");
    const numerator = Number((numText ?? "0").trim());
    const denominator = Number((denomText ?? "1").trim());

    const label = setContent.length === 0
        ? "None"
        : setContent.split(",").map((s) => s.trim()).join(", ");

    return { key: setContent, label, numerator, denominator };
};

const parseDistribution = (data: string): Term[] => {
    if (!data) return [];
    return splitTopLevel(data, "+")
        .map(parseTerm)
        .filter((t): t is Term => t !== null);
};

const isValidTerm = (t: Term): boolean => !Number.isNaN(t.numerator) && !Number.isNaN(t.denominator) && t.denominator !== 0;


const estimatedPercent = (t: Term | undefined): string => {
    if (!t) return "0.000";
    if (!isValidTerm(t)) return "Error";
    return ((t.numerator / t.denominator) * 100).toFixed(3);
};

type RangeRow = {
    key: string;
    label: string;
    first?: Term;
    second?: Term;
};

/**
 * Pairs the terms from both sides of an interval by their connection-set
 * key rather than by array position, since each side can list its sets in a
 * different order (or omit sets the other side has).
 */
const buildRangeRows = (firstTerms: Term[], secondTerms: Term[]): RangeRow[] => {
    const firstByKey = new Map(firstTerms.map((t) => [t.key, t]));
    const secondByKey = new Map(secondTerms.map((t) => [t.key, t]));
    const allKeys = [...new Set([...firstByKey.keys(), ...secondByKey.keys()])];

    return allKeys.map((key) => {
        const first = firstByKey.get(key);
        const second = secondByKey.get(key);
        return { key, label: (first ?? second)!.label, first, second };
    });
};

type ParsedResult =
    | { isInterval: true; rows: RangeRow[] }
    | { isInterval: false; terms: Term[] };

const parseResult = (data: string): ParsedResult => {
    const inner = stripOuterBrackets(data);

    if (isIntervalResult(inner)) {
        const [firstRaw, secondRaw] = splitTopLevel(inner, ",");
        const rows = buildRangeRows(parseDistribution(firstRaw), parseDistribution(secondRaw));
        return { isInterval: true, rows };
    }

    return { isInterval: false, terms: parseDistribution(inner) };
};

const Fraction = ({ numerator, denominator }: { numerator: string; denominator: string }) => {
    return (
        <span className="inline-flex flex-col items-center justify-center align-middle mx-1 text-xs">
            <span className="px-1 text-[11px] leading-none">{numerator}</span>
            <span className="w-full h-px bg-foreground/60 my-0.5" />
            <span className="px-1 text-[11px] leading-none">{denominator}</span>
        </span>
    );
};

const RowShell = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 py-1 border-b last:border-0 border-muted/50 text-sm">
        {children}
    </div>
);

const EmptyState = () => (
    <div className="text-sm text-muted-foreground py-1">No connections could have been formed</div>
);

const FormattedOutput = ({ data, estimatedMode }: OutputProps) => {
    if (!data) return <div className="flex flex-col gap-2 bg-background p-4 rounded-lg border shadow-inner"><EmptyState /></div>;

    const result = parseResult(data);

    return (
        <div className="flex flex-col gap-2 bg-background p-4 rounded-lg border shadow-inner">
            {result.isInterval ? (
                result.rows.length === 0 ? (
                    <EmptyState />
                ) : (
                    result.rows.map((row) => (
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
                                    <Fraction
                                        numerator={row.first ? String(row.first.numerator) : "0"}
                                        denominator={row.first ? String(row.first.denominator) : "1"}
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <Fraction
                                        numerator={row.second ? String(row.second.numerator) : "0"}
                                        denominator={row.second ? String(row.second.denominator) : "1"}
                                    />
                                </>
                            )}
                        </RowShell>
                    ))
                )
            ) : result.terms.length === 0 ? (
                <EmptyState />
            ) : (
                result.terms.map((term) => (
                    <RowShell key={term.key}>
                        <span className="text-muted-foreground">Connection:</span>
                        <span className="font-semibold bg-muted px-2 py-0.5 rounded text-xs">{term.label}</span>
                        <span className="text-muted-foreground">|</span>
                        {estimatedMode ? (
                            <>
                                <span className="text-muted-foreground">Estimated Probability:</span>
                                <span className="font-bold text-primary">{estimatedPercent(term)}%</span>
                            </>
                        ) : (
                            <>
                                <span className="text-muted-foreground">Probability:</span>
                                <Fraction numerator={String(term.numerator)} denominator={String(term.denominator)} />
                            </>
                        )}
                    </RowShell>
                ))
            )}
        </div>
    );
};

export default FormattedOutput;