import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useState} from "react";
import {useTour} from "@reactour/tour";

const TutorialMenu = () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const {setIsOpen} = useTour();


    //TODO add other tutorials, with setSteps
    const tutorials = [
        {name: "Interface Tutorial", action: () => setIsOpen(true)},
        {name: "Protocol Tutorial Basic", action: () => setIsOpen(true)},
        {name: "Protocol Tutorial Advanced", action: () => setIsOpen(true)}
    ]

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>

            <DialogTrigger asChild>
                <Button variant="outline" className='hidden md:flex rounded-sm p-5 border-2 dark:hover:bg-muted'>
                    Tutorials
                </Button>
            </DialogTrigger>

            <DialogContent showCloseButton={true}>
                <div className="flex flex-col gap-4 p-2 py-4">
                    {tutorials.map(tutorial => (
                        <Button
                            className="rounded-sm"
                            onClick={() => {
                                setDialogOpen(false);
                                tutorial.action()
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