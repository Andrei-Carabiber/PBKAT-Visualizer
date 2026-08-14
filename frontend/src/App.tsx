import { useEffect, useMemo } from "react";
import {ThemeProvider} from "@/components/theme-provider";
import MainView from "@/views/MainView.tsx";
import { MainLayout } from "./layout/MainLayout.tsx";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoadRedirect from "@/views/LoadRedirect.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { ReactFlowProvider } from "@xyflow/react";
import { type StepType, TourProvider } from "@reactour/tour";
import { useCustomization } from "@/store/customization.ts";

function App() {
    const { lockTour, setLockTour } = useCustomization();

    useEffect(() => {
        if (!lockTour) return;

        const blockReactourKeys = (e: KeyboardEvent) => {
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

    const steps: StepType[] = useMemo(() => [
        {
            selector: '#monaco-editor-container',
            content: 'This is the protocol editor. Here you write the steps of your Quantum Protocol',
        },
        {
            selector: '#node-editor-container',
            content: 'This is the node editor. Here you define your quantum network and its specifications',
        },
        {
            selector: '#network-goal-box',
            content: 'This is the network goal box. Here you write the goal that you want to calculate the probability of.',
        },
        {
            selector: '#network-capacity-box',
            content: 'This is the network capacity box. Here you write the amount of connections there can be between 2 nodes. If not present for 2 nodes, then it counts as unlimited.',
        },
        {
            selector: '#flag-settings-button',
            content: 'This is execution settings button.',
            padding: 2
        },
        {
            selector: '#settings-button',
            content: 'This is node editor settings button. It can help you set quickly default values and change values for all nodes and edges',
        },
        {
            selector: '#run-protocol-button',
            content: 'After you set up your protocol, your network, goal, capacity and other execution settings click here to execute. Try it.',
            action: (node) => {
                setLockTour(true);
                if (node) {
                    node.addEventListener('click', () => {
                        setLockTour(false);
                    }, { once: true });
                }
            }
        },
        {
            selector: '#result-display-window',
            content: 'This is the result display window. Here you can visualize your results.',
        },
    ], [setLockTour]);

    const handleTourClose = ({ setIsOpen, setCurrentStep }: { setIsOpen: (v: boolean) => void, setCurrentStep: (v: number) => void }) => {
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
                            steps={steps}
                            showPrevNextButtons={!lockTour}
                            disableKeyboardNavigation={lockTour}
                            disableDotsNavigation={true}
                            showDots={false}
                            onClickMask={handleTourClose}
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