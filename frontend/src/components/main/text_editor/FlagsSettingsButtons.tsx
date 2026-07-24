import {Button} from "@/components/ui/button.tsx";
import {CircleQuestionMark, Settings} from "lucide-react";
import {useRunEngine} from "@/store/runEngine.ts";
import {Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog.tsx";
import {useState} from "react";
import {Switch} from "@/components/ui/switch.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Input} from "@/components/ui/input.tsx";

const FlagsSettingsButtons = () => {
    const {
        pure, computeExtremal, dumpDp, truncation, coverage,
        setPure, setComputeExtremal, setDumpDp, setTruncation, setCoverage
    } = useRunEngine();
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

    return (
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className="p-5 dark:hover:bg-muted">
                    <Settings/>
                </Button>
            </DialogTrigger>

            <DialogContent showCloseButton={false} className="sm:max-w-lg px-4">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl w-full text-left">
                        Manage execution settings

                        <Tooltip>
                            <TooltipTrigger>
                                <CircleQuestionMark />
                            </TooltipTrigger>
                            <TooltipContent>
                                Only for modes MDP and QMDP
                            </TooltipContent>
                        </Tooltip>
                    </DialogTitle>
                </DialogHeader>

                {/* Settings Grid - Aligns Label (1fr), Control (auto), and Tooltip (auto) */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-y-6 gap-x-6 py-4 items-center">

                    {/* PURE */}
                    <Label className="text-lg">Pure</Label>
                    <Switch
                        className="data-[size=default]:h-5.5 data-[size=default]:w-10 [&_span]:group-data-[size=default]/switch:size-5 data-checked:[&_span]:translate-x-4.5 data-checked:[&_span]:rtl:-translate-x-4.5"
                        checked={pure}
                        onCheckedChange={() => setPure(!pure)}
                    />
                    <Tooltip>
                        <TooltipTrigger type="button">
                            <CircleQuestionMark
                                className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"/>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Pure options does : X.</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* COMPUTE EXTREMAL */}
                    <Label className="text-lg">Compute Extremal</Label>
                    <Switch
                        className="data-[size=default]:h-5.5 data-[size=default]:w-10 [&_span]:group-data-[size=default]/switch:size-5 data-checked:[&_span]:translate-x-4.5 data-checked:[&_span]:rtl:-translate-x-4.5"
                        checked={computeExtremal}
                        onCheckedChange={() => setComputeExtremal(!computeExtremal)}
                    />
                    <Tooltip>
                        <TooltipTrigger type="button">
                            <CircleQuestionMark
                                className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"/>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Compute Extremal options does : X.</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* DUMP DP */}
                    <Label className="text-lg">Dump Dp</Label>
                    <Switch
                        className="data-[size=default]:h-5.5 data-[size=default]:w-10 [&_span]:group-data-[size=default]/switch:size-5 data-checked:[&_span]:translate-x-4.5 data-checked:[&_span]:rtl:-translate-x-4.5"
                        checked={dumpDp}
                        onCheckedChange={() => setDumpDp(!dumpDp)}
                    />
                    <Tooltip>
                        <TooltipTrigger type="button">
                            <CircleQuestionMark
                                className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"/>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>DumpDp options does : X.</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* TRUNCATION */}
                    <Label className="text-lg">Truncation</Label>
                    <Input
                        type="number"
                        className="w-24 text-right"
                        value={truncation}
                        step={1}
                        min={-1}
                        onChange={(e) => setTruncation(Number(e.target.value))}
                    />
                    <Tooltip>
                        <TooltipTrigger type="button">
                            <CircleQuestionMark
                                className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"/>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Truncation options does : X. -1 to disable</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* COVERAGE */}
                    <Label className="text-lg">Coverage</Label>
                    <div>
                        <Input
                            type="number"
                            step={0.01}
                            min={-1}
                            max={1}
                            className="w-24 text-right"
                            value={coverage}
                            onChange={(e) => {
                                const val = e.target.value;

                                // Pass the raw string directly!
                                // This allows the box to be empty, hold a minus sign, or hold a decimal temporarily.
                                if (val === "" || val === "-" || val.endsWith(".")) {
                                    setCoverage(val);
                                    return;
                                }

                                const nr = Number(val);

                                // Your custom arrow snapping logic
                                if (nr > -1 && nr < -0.5) {
                                    setCoverage(0);
                                } else if (nr < 0) {
                                    setCoverage(-1);
                                } else if (nr > 1) {
                                    setCoverage(1);
                                } else {
                                    setCoverage(val); // Also pass the string here to preserve trailing zeros like "0.50"
                                }
                            }}
                            onBlur={() => {
                                if (coverage === "" || coverage === "-") {
                                    setCoverage(-1);
                                } else if (typeof coverage === "string") {
                                    setCoverage(Number(coverage));
                                }
                            }}
                        />
                    </div>
                    <Tooltip>
                        <TooltipTrigger type="button">
                            <CircleQuestionMark
                                className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"/>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Coverage options does : X. -1 to disable</p>
                        </TooltipContent>
                    </Tooltip>

                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            className="text-sm px-10 py-4 border-2 border-secondary-foreground dark:hover:bg-muted"
                        >
                            Close
                        </Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default FlagsSettingsButtons;