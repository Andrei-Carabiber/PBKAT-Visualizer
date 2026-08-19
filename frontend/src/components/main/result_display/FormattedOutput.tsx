import React, { useMemo } from "react";
import {type ActiveConnection, useRunEngine} from "@/store/runEngine.ts";
import type { FormattedDataType } from "@/store/formatData.ts";
import { aggregateConnections } from "@/lib/utils.ts";

type OutputProps = {
    compare?: {
        displayData: FormattedDataType;
        networkGoal: ActiveConnection[];
    }
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

const estimatedPercent = (t?: Term): string => {
    if (!t || Number.isNaN(t.numerator) || !t.denominator) return "0.000";
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

const RowCard = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-wrap items-center gap-2 bg-background p-3.5 rounded-lg border shadow-inner text-sm min-h-13">
        {children}
    </div>
);

const EmptyState = () => (
    <div className="bg-background p-4 rounded-lg border shadow-inner text-sm text-muted-foreground min-h-13 flex items-center">
        No connections could have been formed
    </div>
);

// --- Main Component ---

const FormattedOutput = ({ compare, estimatedMode }: OutputProps) => {
    const { formattedData, goalConnections } = useRunEngine();

    const dataToDisplay = compare?.displayData ?? formattedData;

    // Pick the source array first, then use a single unconditional useMemo
    const targetGoals = compare?.networkGoal ?? goalConnections;
    const aggregatedGoalConnections = useMemo(
        () => aggregateConnections(targetGoals),
        [targetGoals]
    );

    if (!dataToDisplay) {
        return null;
    }

    // Single Probability Goal Mode
    if (dataToDisplay.mode === "probability") {
        const { lowerEnd, higherEnd } = dataToDisplay.probability;
        const isExact = lowerEnd.numerator === higherEnd.numerator && lowerEnd.denominator === higherEnd.denominator;

        return (
            <div id="probability-output" className="flex flex-col gap-3 bg-background p-4 rounded-lg border shadow-inner">
                <div className="text-sm leading-relaxed flex flex-wrap items-center gap-y-1">
                    <span>The probability of achieving your Network goal (</span>
                    {aggregatedGoalConnections.length === 0 ? (
                        <span className="italic text-muted-foreground">no goals selected</span>
                    ) : (
                        aggregatedGoalConnections.map((conn, idx) => (
                            <React.Fragment key={conn.id || conn.label}>
                                <span className="inline-flex items-center h-6 rounded bg-muted px-1.5 mx-0.5">
                                    <span className="font-semibold text-xs leading-none">{conn.label}</span>
                                    {conn.count > 1 && (
                                        <span className="font-mono text-xs text-muted-foreground ml-1 leading-none">
                                            X {conn.count}
                                        </span>
                                    )}
                                </span>
                                {idx < aggregatedGoalConnections.length - 1 && <span>,</span>}
                            </React.Fragment>
                        ))
                    )}
                    <span>) is:</span>
                </div>

                {estimatedMode ? (
                    <div className="flex items-center gap-2 text-primary font-bold text-base min-h-11">
                        <span>{estimatedPercent(lowerEnd)}%</span>
                        {!isExact && (
                            <>
                                <span className="text-muted-foreground">-</span>
                                <span>{estimatedPercent(higherEnd)}%</span>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 font-bold text-base min-h-11">
                        <Fraction numerator={lowerEnd.numerator} denominator={lowerEnd.denominator} />
                        {!isExact && (
                            <>
                                <span className="text-muted-foreground">-</span>
                                <Fraction numerator={higherEnd.numerator} denominator={higherEnd.denominator} />
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Full Run Mode
    if (dataToDisplay.mode === "run") {
        if (dataToDisplay.isInterval) {
            const rows = dataToDisplay.probability as RangeRow[];

            if (!rows || rows.length === 0) {
                return <EmptyState />;
            }

            return (
                <div id="run-output" className="flex flex-col gap-2">
                    {rows.map((row) => (
                        <RowCard key={row.key}>
                            <span className="text-muted-foreground">Connection:</span>
                            <span className="inline-flex items-center h-6 font-semibold bg-muted px-2 rounded text-xs leading-none">
                                {row.label}
                            </span>
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
                        </RowCard>
                    ))}
                </div>
            );
        }

        // Single term run output (no interval)
        const singleTerms = dataToDisplay.probability as DistributionTerm[];
        if (!singleTerms || singleTerms.length === 0) {
            return <EmptyState />;
        }

        return (
            <div id="run-output" className="flex flex-col gap-2">
                {singleTerms.map(({ key, label, term }) => (
                    <RowCard key={key}>
                        <span className="text-muted-foreground">Connection:</span>
                        <span className="inline-flex items-center h-6 font-semibold bg-muted px-2 rounded text-xs leading-none">
                            {label}
                        </span>
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
                    </RowCard>
                ))}
            </div>
        );
    }

    return null;
};

export default FormattedOutput;