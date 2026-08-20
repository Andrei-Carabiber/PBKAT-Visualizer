import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useState} from "react";
import {useTour} from "@reactour/tour";
import {useTutorialSteps, bumpTutorialEpoch} from "@/store/useTutorialSteps.ts";
import {useRunEngine} from "@/store/runEngine.ts";
import {toast} from "sonner";
import {ScrollContainerWithShadow} from "@/components/web/header-buttons/scroll-container-with-shadow.tsx";

type Tutorial = {
    name: string,
    action: () => void
}
type Separator = {
    title: string,
}
const TutorialMenu = () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const {setIsOpen, setSteps, setCurrentStep} = useTour();
    const {setUserCodeCallback, getUserCodeCallback, clearOutput} = useRunEngine();

    if (!setSteps) return null;

    const {
        interfaceSteps,
        createTutorialSteps, transTutorialSteps, distillTutorialSteps, swapTutorialSteps, ucreateTutorialSteps,
        qbkatTutorialSteps
    } = useTutorialSteps();


    const tutorials: (Tutorial | Separator)[] = [
        {
            title: "Interface Tutorial"
        },
        {
            name: "Interface Tutorial", action: () => {
                setSteps(interfaceSteps);
            }
        },
        {
            title: "Basic Actions Tutorials"
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
        },
        {
            name: "QBKAT Tutorial", action : () => {setSteps(qbkatTutorialSteps)}
        },
        {
            title: "Advanced Protocol Writing Tutorials"
        },
        {
            name: "Tutorial 1", action: () => {
            }
        },
        {
            name: "Tutorial 2", action: () => {
            }
        },
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
                        {tutorials.map((tutorial) => {
                            if ("title" in tutorial) {
                                return (
                                    <div key={tutorial.title + "separator"} className="flex flex-col gap-1 text-sm text-foreground/70">
                                        <p>{tutorial.title}</p>
                                        <div className="w-full h-0.5 bg-foreground/40" />
                                    </div>
                                )
                            } else {
                                return (
                                    <Button
                                        key={tutorial.name + "button"}
                                        className="rounded-sm py-4"
                                        onClick={() => {
                                            bumpTutorialEpoch();
                                            clearOutput();
                                            setDialogOpen(false);
                                            tutorial.action();
                                            setCurrentStep(0);
                                            setIsOpen(true);
                                        }}
                                    >
                                        {tutorial.name}
                                    </Button>
                                )
                            }
                        })}                    </div>
                </ScrollContainerWithShadow>
            </DialogContent>
        </Dialog>
    );
};

export default TutorialMenu;