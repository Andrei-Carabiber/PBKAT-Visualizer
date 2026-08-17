import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useState} from "react";
import {useTour} from "@reactour/tour";
import {useTutorialSteps, bumpTutorialEpoch} from "@/store/useTutorialSteps.ts";
import {useRunEngine} from "@/store/runEngine.ts";
import {toast} from "sonner";
import {ScrollContainerWithShadow} from "@/components/web/header-buttons/scroll-container-with-shadow.tsx";

const TutorialMenu = () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const {setIsOpen, setSteps, setCurrentStep} = useTour();
    const {setUserCodeCallback, getUserCodeCallback, clearOutput} = useRunEngine();

    if (!setSteps) return null;

    const {
        interfaceSteps,
        createTutorialSteps, transTutorialSteps, distillTutorialSteps, swapTutorialSteps, ucreateTutorialSteps
    } = useTutorialSteps();

    const tutorials = [
        {
            name: "Interface Tutorial", action: () => {
                setSteps(interfaceSteps);
            }
        },
        {
            name: "Create Pair Tutorial",
            action: () => setSteps(createTutorialSteps)
        },
        {
            name: "Transmission Tutorial", action: () => {
                setSteps(transTutorialSteps);
            }
        },
        {
            name: "Distillation Tutorial", action: () => {
                setSteps(distillTutorialSteps);
            }
        },
        {
            name: "Swap Tutorial", action: () => {
                setSteps(swapTutorialSteps);
            }
        },
        {
            name: "Generation Tutorial", action: () => {
                setSteps(ucreateTutorialSteps);
            }
        }
    ];

    const handleTriggerClick = (e: React.MouseEvent) => {
        const isEditorLoaded = Boolean(setUserCodeCallback && getUserCodeCallback);

        if (!isEditorLoaded) {
            e.preventDefault();
            toast.error("Please wait for the editor to load");
        }
    };

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className='hidden md:flex rounded-sm p-5 border-2 dark:hover:bg-muted'
                    onClick={handleTriggerClick}
                >
                    Tutorials
                </Button>
            </DialogTrigger>

            <DialogContent showCloseButton={true}>
                <ScrollContainerWithShadow height={40}>
                    <div className="flex flex-col gap-4 p-2 py-4">
                        {tutorials.map(tutorial => (
                            <Button
                                key={tutorial.name}
                                className="rounded-sm py-4"
                                onClick={() => {
                                    bumpTutorialEpoch();
                                    clearOutput()
                                    setDialogOpen(false);
                                    tutorial.action();
                                    setCurrentStep(0);
                                    setIsOpen(true);
                                }}
                            >
                                {tutorial.name}
                            </Button>
                        ))}
                    </div>
                </ScrollContainerWithShadow>
            </DialogContent>
        </Dialog>
    );
};

export default TutorialMenu;