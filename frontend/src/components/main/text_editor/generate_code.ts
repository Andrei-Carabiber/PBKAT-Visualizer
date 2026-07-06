export const generateFullCode = (userCode: string) => `{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE OverloadedLists #-}

import BellKAT.Prelude
import BellKAT.ProbabilisticPrelude

import qualified Data.ByteString.Lazy as BS
import qualified Data.Aeson as A

-- BEGIN USER CODE
${userCode}
-- END USER CODE

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