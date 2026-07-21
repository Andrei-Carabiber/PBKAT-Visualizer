import {ModeToggle} from "@/components/theme-toggle.tsx";
import SaveButtons from "@/components/web/header-buttons/SaveButtons.tsx";

const Header = () => {
    return (
        <header className="h-16 border-b flex items-center justify-between px-6">
            <div className="flex gap-5 items-center">
                <h1 className="font-bold">PBKAT Visualizer</h1>

                <SaveButtons />

            </div>

            <ModeToggle />
        </header>
    );
};

export default Header;
