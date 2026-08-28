import {type ReactNode} from "react";
import Header from "@/components/web/header.tsx";
import Footer from "@/components/web/footer.tsx";
import {Toaster} from "sonner";
import {useTheme} from "@/components/theme-provider.tsx";

interface LayoutProps {
    children: ReactNode;
}

export function MainLayout({children}: Readonly<LayoutProps>) {
    const theme = useTheme().theme;
    return (
        // Changed max-h-screen to min-h-screen
        <div className="min-h-screen flex flex-col bg-background">
            <Header/>

            {/* Removed overflow-hidden so the page can scroll natively when results are present */}
            <main className="flex-1 p-6 min-h-0 flex flex-col">
                {children}
            </main>

            <Toaster theme={theme as "light" | "dark" | "system"} position="top-center" />

            <Footer />
        </div>
    );
}