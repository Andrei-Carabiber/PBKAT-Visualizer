import TextEditor from "@/components/main/text_editor/textEditor.tsx";
import NodeEditor from "@/components/main/node_editor/nodeEditor.tsx";
import {Group, Panel, Separator} from "react-resizable-panels";
import {useState} from "react";
import ResultDisplayWindow from "@/components/main/result_display/ResultDisplayWindow.tsx";

const MainView = () => {

    const [leftPanelSize, setLeftPanelSize] = useState<number>(50);
    const [rightPanelSize, setRightPanelSize] = useState<number>(50)

    return (
        <div className="flex flex-1 flex-col h-full min-h-0 gap-4">

            <ResultDisplayWindow />

            <Group className="flex flex-1 min-h-0 gap-1">
                <Panel
                    minSize="25%"
                    collapsible={true}
                    className="h-full"
                    onResize={(percentageSize) => setLeftPanelSize(percentageSize.inPixels)}
                >
                    <TextEditor panelSize={leftPanelSize}/>
                </Panel>
                <Separator
                    className="relative flex w-3 items-center justify-center bg-transparent group hover:bg-muted-foreground/10 data-[dragging=true]:bg-primary/20 transition-colors duration-150 cursor-col-resize rounded-sm">
                    <div
                        className="h-8 w-1/2 bg-muted-foreground/30 group-hover:bg-muted-foreground group-data-[dragging=true]:bg-primary rounded"/>
                </Separator>
                <Panel minSize='30%'
                       collapsible={true}
                       className="h-full"
                       onResize={(percentageSize) => setRightPanelSize(percentageSize.inPixels)}>
                    <NodeEditor panelSize={rightPanelSize}/>
                </Panel>
            </Group>
        </div>
    );
};

export default MainView;