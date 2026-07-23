import {Input} from "@/components/ui/input.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import type {Dispatch, SetStateAction} from "react";

const MaxIterationsBox = ({maxIterations, setMaxIterations} : {maxIterations: number; setMaxIterations: Dispatch<SetStateAction<number>>}) => {


    return (
        <div className="w-full h-full rounded-lg border bg-background px-3 py-4 shadow-sm">
            <div className="h-full flex flex-col justify-around items-center mb-4">
                <p>Iterations</p>
                <Input type="number" value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value))}/>
                <Tooltip>
                    <TooltipTrigger
                        className="mt-4 flex h-6 w-6 cursor-help items-center justify-center rounded-full bg-muted text-sm hover:bg-muted/80">
                        ?
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-center">
                        Set the iterations limit for the protocol in case you have a loop.
                        The bigger the number the longer the calculation will take. If set to 0 it will be disabled.
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
};

export default MaxIterationsBox;