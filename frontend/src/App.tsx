import {ThemeProvider} from "@/components/theme-provider"
import MainView from "@/views/MainView.tsx";
import {MainLayout} from "./layout/MainLayout.tsx";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom"
import LoadRedirect from "@/views/LoadRedirect.tsx";
import {TooltipProvider} from "@/components/ui/tooltip.tsx";

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <TooltipProvider>
                    <MainLayout>
                        <Routes>
                            <Route path="/" element={<MainView/>}/>

                            <Route path="/load/:token" element={<LoadRedirect/>}/>

                            <Route path="*" element={<Navigate to="/" replace/>}/>
                        </Routes>
                    </MainLayout>
                </TooltipProvider>
            </ThemeProvider>
        </BrowserRouter>
    )
}

export default App
