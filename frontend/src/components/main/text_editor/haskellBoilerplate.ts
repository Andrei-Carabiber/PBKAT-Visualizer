export const EDITABLE_START_MARKER = '-- >>> EDITABLE REGION START >>>';
export const EDITABLE_END_MARKER = '-- <<< EDITABLE REGION END <<<';

// Everything above the start marker: pragmas + imports the user never edits.
export const PRELUDE = `{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE OverloadedLists #-}

import BellKAT.Prelude
import BellKAT.ProbabilisticPrelude
\n\n\n\n
${EDITABLE_START_MARKER}
`;

export const SUFFIX = `
${EDITABLE_END_MARKER}
\n\n\n\n
networkCapacity :: NetworkCapacity BellKATTag
networkCapacity = ["C" ~ "C", "C" ~ "C", "A" ~ "C", "B" ~ "C"]

actionConfig :: ProbabilisticActionConfiguration
actionConfig = PAC
    { pacTransmitProbability = [(("C", "B"), 1 / 2),(("C", "A"), 4 / 5)]
    , pacCreateProbability = [("C", 9/10)]
    , pacCreateWerner = [("C", 1.0)]
    , pacUCreateProbability = []
    , pacUCreateWerner = []
    , pacSwapProbability = []
    , pacCoherenceTime = [("A", 1), ("B", 1), ("C", 1)]
    , pacDistances = [(("A", "B"), 1), (("B", "C"), 1)]
    }

goal :: ProbBellKATTest
goal = hasSubset ["A" ~ "C", "B" ~ "C"]

main :: IO ()
main = pbkatMain actionConfig (Just networkCapacity) goal p
`;

export const DEFAULT_USER_CODE = `e :: ProbBellKATPolicy
e = create "C" <> trans "C" ("A", "C")

f :: ProbBellKATPolicy
f = create "C" <> trans "C" ("B", "C")

p :: ProbBellKATPolicy
p = (e <.> f) <> (e <.> f)
`;

/** Stitches prelude + user code + suffix into the full source sent to the LSP. */
export function buildFullSource(userCode: string): string {
    return `${PRELUDE}\n${userCode}\n${SUFFIX}`;
}
