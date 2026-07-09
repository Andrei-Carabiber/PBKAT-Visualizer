{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE OverloadedLists #-}

import BellKAT.Prelude
import BellKAT.ProbabilisticPrelude





-- >>> EDITABLE REGION START >>>


e :: ProbBellKATPolicy
e = create "C" <> trans "C" ("A", "C")

f :: ProbBellKATPolicy
f = create "C" <> trans "C" ("B", "C") <> trans "C" ("B", "C") <> trans "C" ("B", "C") <> trans "C" ("B", "C") <> trans "C" ("B", "C")

p :: ProbBellKATPolicy
p = (e <.> f) <> (e <.> f)



-- <<< EDITABLE REGION END <<<





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
