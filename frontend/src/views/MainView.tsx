import TextEditor from "@/components/main/text_editor/textEditor.tsx";
import NodeEditor from "@/components/main/node_editor/nodeEditor.tsx";
import { Group, Panel, Separator } from "react-resizable-panels";
import { useState, useEffect } from "react";
import ResultDisplayWindow from "@/components/main/result_display/ResultDisplayWindow.tsx";
import { useRunEngine } from "@/store/runEngine.ts";

function useIsMobile() {
    const [isMobile, setIsMobile] = useState<boolean>(() =>
        typeof window !== "undefined" ? window.innerWidth < 768 : false
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 767px)");
        const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        setIsMobile(mediaQuery.matches);

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    return isMobile;
}

const MainView = () => {
    const [leftPanelSize, setLeftPanelSize] = useState<number>(50);
    const [rightPanelSize, setRightPanelSize] = useState<number>(50);

    const isMobile = useIsMobile();

    // We import data, error, and loading to check if the result window is active
    const { viewMode, data, error, loading } = useRunEngine();
    const hasResults = !!(data || error || loading);

    if (isMobile) {
        return (
            <div className="flex flex-1 flex-col h-full w-full min-h-0 gap-4">
                <ResultDisplayWindow />

                {/* If results are present, we give the editors a safe minimum height (e.g., 60vh) so they don't squish. */}
                <div className={`flex-1 relative ${hasResults ? 'min-h-[60vh]' : 'min-h-0'}`}>
                    {/* The absolute wrapper guarantees internal elements can't stretch the page height */}
                    <div className="absolute inset-0">
                        <div className={`absolute inset-0 w-full h-full ${viewMode === 'protocol' ? 'block' : 'hidden'}`}>
                            <TextEditor panelSize={typeof window !== 'undefined' ? window.innerWidth : 400} />
                        </div>
                        <div className={`absolute inset-0 w-full h-full ${viewMode === 'node' ? 'block' : 'hidden'}`}>
                            <NodeEditor panelSize={typeof window !== 'undefined' ? window.innerWidth : 400} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Desktop Layout
    return (
        <div className="flex flex-1 flex-col h-full w-full min-h-0 gap-4">
            <ResultDisplayWindow />

            <div className={`flex-1 relative ${hasResults ? 'min-h-[60vh]' : 'min-h-0'}`}>
                <div className="absolute inset-0">
                    <Group className="flex w-full h-full gap-1">
                        <Panel
                            minSize={"40%"}
                            collapsible={true}
                            className="h-full"
                            onResize={(percentageSize) => setLeftPanelSize(percentageSize.inPixels)}
                        >
                            <TextEditor panelSize={leftPanelSize} />
                        </Panel>
                        <Separator
                            className="relative flex w-3 items-center justify-center bg-transparent group hover:bg-muted-foreground/10 transition-colors duration-150 cursor-col-resize rounded-sm"
                        >
                            <div className="h-8 w-1/2 bg-muted-foreground/30 group-hover:bg-muted-foreground rounded" />
                        </Separator>
                        <Panel
                            minSize={"40%"}
                            collapsible={true}
                            className="h-full"
                            onResize={(percentageSize) => setRightPanelSize(percentageSize.inPixels)}
                        >
                            <NodeEditor panelSize={rightPanelSize} />
                        </Panel>
                    </Group>
                </div>
            </div>
        </div>
    );
};

export default MainView;