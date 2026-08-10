import {useRunEngine} from "@/store/runEngine.ts";

type OutputProps = {
    estimatedMode: boolean;
};

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


const estimatedPercent = (t: Term): string => {
    if (!t || isNaN(t.numerator) || !t.denominator) return "0.000";
    return ((t.numerator / t.denominator) * 100).toFixed(3);
};

// --- UI Subcomponents ---

const Fraction = ({numerator, denominator}: { numerator: string | number; denominator: string | number }) => (
    <span className="inline-flex flex-col items-center justify-center align-middle mx-1 text-sm">
    <span className="px-1 text-[13px] lg:text-[16px] leading-none">{numerator}</span>
    <span className="w-full h-px bg-foreground/60 my-0.5"/>
    <span className="px-1 text-[13px] lg:text-[16px] leading-none">{denominator}</span>
  </span>
);

const RowShell = ({children}: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 py-1 border-b last:border-0 border-muted/50 text-sm">
        {children}
    </div>
);

const EmptyState = () => (
    <div className="text-sm text-muted-foreground py-1">No connections could have been formed</div>
);

// --- Main Component ---

const FormattedOutput = ({estimatedMode}: OutputProps) => {
    const {goalConnections, formattedData, data} = useRunEngine();

    if (!data || !formattedData) {
        return
    }

    // Single Probability Goal Mode
    if (formattedData.mode === "probability") {
        const {lowerEnd, higherEnd} = formattedData.probability;
        const isExact = lowerEnd.numerator === higherEnd.numerator && lowerEnd.denominator === higherEnd.denominator;

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
                        <p>{estimatedPercent(lowerEnd)}%</p>
                        {!isExact && (
                            <>
                                <span>-</span>
                                <p>{estimatedPercent(higherEnd)}%</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-3 font-bold">
                        <Fraction numerator={lowerEnd.numerator} denominator={lowerEnd.denominator}/>
                        {!isExact && (
                            <>
                                <span>-</span>
                                <Fraction numerator={higherEnd.numerator} denominator={higherEnd.denominator}/>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Full Run Mode
    if (formattedData.mode === "run") {

        if (formattedData.isInterval) {
            const rows = formattedData.probability as RangeRow[]

            if (rows.length === 0) {
                return (
                    <div className="flex flex-col gap-2 bg-background p-4 rounded-lg border shadow-inner">
                        <EmptyState/>
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
                                    <Fraction numerator={row.first.numerator} denominator={row.first.denominator}/>
                                    <span className="text-muted-foreground">-</span>
                                    <Fraction numerator={row.second.numerator} denominator={row.second.denominator}/>
                                </>
                            )}
                        </RowShell>
                    ))}
                </div>
            );
        }

        // Single term run output (no interval)
        const singleTerms = formattedData.probability as DistributionTerm[]
        if (singleTerms.length === 0) {
            return (
                <div className="flex flex-col gap-2 bg-background p-4 rounded-lg border shadow-inner">
                    <EmptyState/>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-2 bg-background p-4 rounded-lg border shadow-inner">
                {singleTerms.map(({key, label, term}) => (
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
                                <Fraction numerator={term.numerator} denominator={term.denominator}/>
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