import {ModeToggle} from "@/components/theme-toggle.tsx";
import SaveButtons from "@/components/web/header-buttons/SaveButtons.tsx";
import {useRunEngine} from "@/store/runEngine.ts";
import {Switch} from "@/components/ui/switch.tsx";
import {Label} from "@/components/ui/label.tsx";

const Header = () => {
    const {viewMode, setViewMode} = useRunEngine()

    return (
        <header className="h-16 border-b flex items-center justify-between px-4 md:px-6">
            <div className="flex gap-3 md:gap-5 items-center overflow-hidden">
                <h1 className="font-bold truncate text-sm md:text-base">QBKAT Visualizer</h1>
            </div>

            <div className="flex gap-2 md:hidden">
                <Label>
                    Change View
                </Label>
                <Switch checked={viewMode === 'node'} onCheckedChange={() => setViewMode(viewMode === 'node' ? 'protocol' : 'node')}/>
            </div>


            <div className="flex items-center gap-2">
                <SaveButtons/>
                <ModeToggle/>
            </div>
        </header>
    );
};

export default Header;