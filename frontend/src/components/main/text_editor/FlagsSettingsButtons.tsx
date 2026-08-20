import {Button} from "@/components/ui/button.tsx";
import {CircleQuestionMark, Settings} from "lucide-react";
import {useRunEngine} from "@/store/runEngine.ts";
import {Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog.tsx";
import {useState} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Input} from "@/components/ui/input.tsx";
import {useCustomization} from "@/store/customization.ts";
import {Switch} from "@/components/ui/switch.tsx";

const FlagsSettingsButtons = () => {
    const {
        truncation, coverage, setTruncation, setCoverage, truncationActive, setTruncationActive
    } = useRunEngine();
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

    const {computeWernerQuality, setComputeWernerQuality, showStatistics, setShowStatistics} = useCustomization()

    return (
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" id="flag-settings-button" className="p-5 dark:hover:bg-muted">
                    <Settings/>
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg px-4" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl w-full text-left">
                        Manage execution settings

                        <Tooltip>
                            <TooltipTrigger>
                                <CircleQuestionMark />
                            </TooltipTrigger>
                            <TooltipContent>
                                Only for QBKatPolicy
                            </TooltipContent>
                        </Tooltip>
                    </DialogTitle>
                </DialogHeader>

                <div id="settings-flags-inside-dialog" className="grid grid-cols-[1fr_auto_auto] gap-y-6 gap-x-6 py-4 items-center">

                    {/* Segmented Control Switch */}
                    <button
                        className="flex w-fit bg-muted p-1 rounded-lg cursor-pointer select-none"
                        onClick={() => setTruncationActive(!truncationActive)}
                    >
                        <div
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                                truncationActive
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Truncation
                        </div>
                        <div
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                                !truncationActive
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Coverage
                        </div>
                    </button>

                    {truncationActive ? (
                        <>
                            <Input
                                type="number"
                                className="w-24 text-right"
                                value={truncation}
                                step={1}
                                min={1}
                                onChange={(e) => {
                                    const val = e.target.value;

                                    const nr = Number(val);

                                    if (nr < 1) {
                                        setTruncation(1);
                                    } else {
                                        setTruncation(nr);
                                    }
                                }}
                            />

                            <Tooltip>
                                <TooltipTrigger type="button">
                                    <CircleQuestionMark
                                        className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"/>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Truncation: Stop after a number of iterations. Minimum 1 iteration</p>
                                </TooltipContent>
                            </Tooltip>
                        </>
                    ) : (
                        <>
                            <Input
                                type="number"
                                step={0.01}
                                min={0}
                                max={1}
                                className="w-24 text-right"
                                value={coverage}
                                onChange={(e) => {
                                    const val = e.target.value;

                                    const nr = Number(val);

                                    if (nr < 0) {
                                        setCoverage(0);
                                    } else if (nr > 1) {
                                        setCoverage(1);
                                    } else {
                                        setCoverage(nr);
                                    }
                                }}
                            />
                            <Tooltip>
                                <TooltipTrigger type="button">
                                    <CircleQuestionMark
                                        className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"/>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Coverage: Stop after you have a certain probability covered. Values between 0 and 1</p>
                                </TooltipContent>
                            </Tooltip>
                        </>
                    )}

                    {/*Compute Quality Switch*/}
                    <Label className="text-lg">Compute Quality</Label>
                    <div className="flex items-center justify-around">
                        <Switch checked={computeWernerQuality} onCheckedChange={() => setComputeWernerQuality(!computeWernerQuality)} />
                    </div>
                    <Tooltip>
                        <TooltipTrigger type="button">
                            <CircleQuestionMark
                                className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"/>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>If disabled it will not calculate quality of entangled pair. It will however speed up the calculation.</p>
                        </TooltipContent>
                    </Tooltip>

                    {/*Show Statistics switch*/}
                    <Label className="text-lg">Show Statistics</Label>
                    <div className="flex items-center justify-around">
                        <Switch checked={showStatistics} onCheckedChange={() => setShowStatistics(!showStatistics)} />
                    </div>
                    <Tooltip>
                        <TooltipTrigger type="button">
                            <CircleQuestionMark
                                className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"/>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>If enabled it will show time it took for computation</p>
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