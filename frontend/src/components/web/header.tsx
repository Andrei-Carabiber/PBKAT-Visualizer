import {ModeToggle} from "@/components/theme-toggle.tsx";

const Header = () => {
    return (
        <header className="h-16 border-b flex items-center justify-between px-6">
            <h1 className="font-bold">PBKAT Visualizer</h1>

            <ModeToggle />
        </header>
    );
};

export default Header;
