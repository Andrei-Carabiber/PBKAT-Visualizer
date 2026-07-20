import {ThemeProvider} from "@/components/theme-provider"
import MainView from "@/views/MainView.tsx";
import {MainLayout} from "./layout/MainLayout.tsx";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom"
import LoadRedirect from "@/views/LoadRedirect.tsx";

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <MainLayout>
                    <Routes>
                        <Route path="/" element={<MainView/>} />

                        <Route path="/load/:token" element={<LoadRedirect />} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </MainLayout>
            </ThemeProvider>
        </BrowserRouter>
    )
}

export default App
