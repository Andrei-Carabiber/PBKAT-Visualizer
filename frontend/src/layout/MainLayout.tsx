import type {ReactNode} from "react";
import Header from "@/components/web/header.tsx";
import Footer from "@/components/web/footer.tsx";

interface LayoutProps {
    children: ReactNode;
}

export function MainLayout({children}: LayoutProps) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header/>

            <main className="flex-1 p-6 flex flex-col">
                {children}
            </main>

            <Footer />
        </div>
    );
}