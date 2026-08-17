import { useEffect } from "react";
import {ThemeProvider} from "@/components/theme-provider";
import MainView from "@/views/MainView.tsx";
import { MainLayout } from "./layout/MainLayout.tsx";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoadRedirect from "@/views/LoadRedirect.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { ReactFlowProvider } from "@xyflow/react";
import {TourProvider } from "@reactour/tour";
import { useCustomization } from "@/store/customization.ts";
import { bumpTutorialEpoch } from "@/store/useTutorialSteps.ts";

function App() {
    const { lockTour, setLockTour } = useCustomization();

    useEffect(() => {
        if (!lockTour) return;

        const blockReactourKeys = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;

            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.closest('.nokey') ||
                target.closest('.monaco-editor')
            ) {
                return;
            }

            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
            }
        };

        document.addEventListener('keydown', blockReactourKeys, { capture: true });

        return () => {
            document.removeEventListener('keydown', blockReactourKeys, { capture: true });
        };
    }, [lockTour]);

    const handleTourClose = ({ setIsOpen, setCurrentStep }: { setIsOpen: (v: boolean) => void, setCurrentStep: (v: number) => void }) => {
        bumpTutorialEpoch();
        setIsOpen(false);
        setCurrentStep(0);
        setLockTour(false);
    };

    return (
        <BrowserRouter>
            <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
                <TooltipProvider>
                    <ReactFlowProvider>
                        <TourProvider
                            disableFocusLock={true}
                            disableInteraction={false}
                            steps={[]}
                            showPrevNextButtons={!lockTour}
                            disableKeyboardNavigation={lockTour}
                            disableDotsNavigation={true}
                            showDots={false}
                            onClickMask={() => {}}
                            onClickClose={handleTourClose}
                            styles={{
                                popover: (base) => ({
                                    ...base,
                                    background: 'var(--popover2)',
                                    color: 'var(--popover2-foreground)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'calc(var(--radius) + 2px)',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                }),
                                badge: (base) => ({
                                    ...base,
                                    background: 'var(--primary)',
                                    color: 'var(--primary-foreground)',
                                }),
                                close: (base) => ({
                                    ...base,
                                    color: 'var(--muted-foreground)',
                                }),
                            }}
                        >
                            <MainLayout>
                                <Routes>
                                    <Route path="/" element={<MainView/>}/>
                                    <Route path="/load/:token" element={<LoadRedirect/>}/>
                                    <Route path="*" element={<Navigate to="/" replace/>}/>
                                </Routes>
                            </MainLayout>
                        </TourProvider>
                    </ReactFlowProvider>
                </TooltipProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;