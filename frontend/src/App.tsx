import {ThemeProvider} from "@/components/theme-provider"
import MainView from "@/views/MainView.tsx";
import {MainLayout} from "./layout/MainLayout.tsx";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom"
import LoadRedirect from "@/views/LoadRedirect.tsx";
import {TooltipProvider} from "@/components/ui/tooltip.tsx";
import {ReactFlowProvider} from "@xyflow/react";
import {type StepType, TourProvider} from "@reactour/tour";

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <TooltipProvider>
                    <ReactFlowProvider>
                        <TourProvider steps={steps}>
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
    )
}

const steps : StepType[] = [
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
        selector: '#network-goal-box',
        content: 'This is the network goal box. Here you write the goal that you want to calculate the probability of.',
    },
    {
        selector: '#network-capacity-box',
        content: 'This is the network capacity box. Here you write the amount of connections there can be between 2 nodes.' +
            'If not present for 2 nodes, then it counts as unlimited.',
    },
    {
        selector: '#flag-settings-button',
        content: 'This is execution settings button.',
    },
    {
        selector: '#settings-button',
        content: 'This is node editor settings button. It can help you set quickly default values and change values for all nodes and edges',
    },
    {
        selector: '#run-protocol-button',
        content: 'After you set up your protocol, your network, goal, capacity and other execution settings click here to execute. Try it.',

    },
    {
        selector: '#result-display-window',
        content: 'This is the result display window. Here you can visualize your results.',
    },

]


export default App
