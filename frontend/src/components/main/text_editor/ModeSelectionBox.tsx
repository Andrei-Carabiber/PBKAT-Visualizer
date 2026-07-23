import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import type {Dispatch, SetStateAction} from "react";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import type {ModeType} from "@/components/main/text_editor/textEditor";

const items: { value: ModeType; label: string; description: string }[] = [
    {value: "normal", label: "Normal", description: "It will show you all of the probability distributions. Must use ProbBellKatPolicy"},
    {value: "probability", label: "Probability", description: "It will show you the probability of achieving the network goal. Must use ProbBellKatPolicy"},
    {value: "qmdp", label: "QMDP", description: "It will show you all of the probability distributions. Must use QBKATPolicy"},
    {value: "mdp", label: "MDP", description: "It will show you all of the probability distributions. Must use QBKATPolicy"},
];

const ModeSelectionBox = ({mode, setMode}: { mode: ModeType; setMode: Dispatch<SetStateAction<ModeType>> }) => {

    return (
        <div className="w-full h-full rounded-lg border bg-background px-3 py-4 shadow-sm">
            <div className="h-full flex flex-col justify-center gap-5 items-center mb-4">
                <p className="mb-2 font-medium">Mode</p>

                <Select value={mode} onValueChange={(val) => setMode(val as ModeType)}>
                    <SelectTrigger className="text-center min-w-24 max-w-48 py-5">
                        <SelectValue className="text-center" placeholder="Select a mode..."/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Modes</SelectLabel>
                            {items.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            {item.label}
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs text-center">
                                            {item.description}
                                        </TooltipContent>
                                    </Tooltip>
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

export default ModeSelectionBox;