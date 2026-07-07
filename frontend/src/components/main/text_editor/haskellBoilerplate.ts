export const EDITABLE_START_MARKER = '-- >>> EDITABLE REGION START >>>';
export const EDITABLE_END_MARKER = '-- <<< EDITABLE REGION END <<<';

// Everything above the start marker: pragmas + imports the user never edits.
export const PRELUDE = `{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE OverloadedLists #-}

import BellKAT.Prelude
import BellKAT.ProbabilisticPrelude

import qualified Data.ByteString.Lazy as BS
import qualified Data.Aeson as A
\n\n\n\n
${EDITABLE_START_MARKER}
`;

// Everything below the end marker: the actionConfig + main that get appended
// after the user's protocol definition.
export const SUFFIX = `
${EDITABLE_END_MARKER}
\n\n\n\n
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

main :: IO ()
main =
    let cdbps = applyStarPolicy' actionConfig p []
     in BS.putStr (A.encode cdbps) >> putStrLn ""
`;

// What a brand-new editor session starts with in the editable middle.
export const DEFAULT_USER_CODE = `e :: BellKATPolicy
e = create "C" <> trans "C" ("A", "C")

f :: BellKATPolicy
f = create "C" <> trans "C" ("B", "C")

p :: BellKATPolicy
p = (e <.> f) <> (e <.> f)
`;

/** Stitches prelude + user code + suffix into the full source sent to the LSP. */
export function buildFullSource(userCode: string): string {
    return `${PRELUDE}\n${userCode}\n${SUFFIX}`;
}
