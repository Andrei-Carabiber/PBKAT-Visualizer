import {type ReactNode} from "react";
import Footer from "@/components/web/footer.tsx";
import {Toaster} from "sonner";
import {useTheme} from "@/components/theme-provider.tsx";
import {useNavigate} from "react-router-dom";
import {useCompareStore} from "@/store/useCompareStore.ts";

interface LayoutProps {
    children: ReactNode;
}

export function CompareLayout({children}: LayoutProps) {
    const theme = useTheme().theme;
    const navigate = useNavigate();
    const {clearCompare} = useCompareStore()
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <header className="h-16 border-b flex items-center justify-between px-4 md:px-6">
                <div className="flex md:gap-10 items-center overflow-hidden">
                    <h1 className="font-bold truncate text-sm md:text-base hover:cursor-pointer"
                        onClick={() => {
                            clearCompare()
                            navigate('/')
                        }}>
                        QBKAT Visualizer
                    </h1>
                </div>


            </header>

            <main className="flex-1 p-6 min-h-0 flex flex-col">
                {children}
            </main>

            <Toaster theme={theme as "light" | "dark" | "system"} position="top-center" />

            <Footer />
        </div>
    );
}