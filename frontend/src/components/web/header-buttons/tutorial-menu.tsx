import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useState} from "react";
import {useTour} from "@reactour/tour";
import {useTutorialSteps} from "@/store/useTutorialSteps.ts";
import {useRunEngine} from "@/store/runEngine.ts";
import {toast} from "sonner";

const TutorialMenu = () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const {setIsOpen, setSteps, setCurrentStep} = useTour();
    const {setUserCodeCallback, getUserCodeCallback} = useRunEngine();

    if (!setSteps) return null;

    const {interfaceSteps, basicProtocolSteps, advancedProtocolSteps, createTutorialSteps} = useTutorialSteps();

    const tutorials = [
        {
            name: "Interface Tutorial", action: () => {
                setSteps(interfaceSteps);
            }
        },
        {name: "Create Pair Tutorial", action: () => setSteps(createTutorialSteps)},
        {
            name: "Protocol Tutorial Basic", action: () => {
                setSteps(basicProtocolSteps);
            }
        },
        {
            name: "Protocol Tutorial Advanced", action: () => {
                setSteps(advancedProtocolSteps);
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
                <div className="flex flex-col gap-4 p-2 py-4">
                    {tutorials.map(tutorial => (
                        <Button
                            key={tutorial.name}
                            className="rounded-sm"
                            onClick={() => {
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
            </DialogContent>
        </Dialog>
    );
};

export default TutorialMenu;