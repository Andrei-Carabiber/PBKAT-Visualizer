import TextEditor from "@/components/main/text_editor/textEditor.tsx";
import NodeEditor from "@/components/main/node_editor/nodeEditor.tsx";
import {useRunEngine} from "@/store/runEngine";
import {X} from 'lucide-react'
import {Button} from "@/components/ui/button.tsx";
import {Group, Panel, Separator} from "react-resizable-panels";
import {useState} from "react";
import {Switch} from "@/components/ui/switch.tsx";
import {Label} from "@/components/ui/label.tsx";
import FormattedOutput from "@/components/main/FormattedOutput.tsx";
import FormattedQuantumOutput from "@/components/main/FormattedQuantumOutput.tsx";

const MainView = () => {
    const {data, error, loading, clearOutput, resultMode, resultCommand} = useRunEngine();

    const [leftPanelSize, setLeftPanelSize] = useState<number>(50);
    const [rightPanelSize, setRightPanelSize] = useState<number>(50)

    const [estimatedMode, setEstimatedMode] = useState<boolean>(false)

    return (
        <div className="flex flex-1 flex-col h-full min-h-0 gap-4">
            {(data || error || loading) && (
                <div
                    className="w-full bg-muted/40 border rounded-xl p-4 max-h-fit overflow-y-auto font-mono text-base shadow-sm">
                    <div
                        className="flex items-center justify-between pb-2 mb-2 border-b text-xs uppercase text-muted-foreground">
                        <div className="flex gap-8">
                            <span className="font-bold">Output</span>
                            <div className="flex gap-2">
                                <Label htmlFor="estimated-mode" className="font-semibold">
                                    Estimated Mode
                                </Label>
                                <Switch id="estimated-mode"
                                        onCheckedChange={(checked) => setEstimatedMode(checked)}/>
                            </div>
                        </div>
                        {loading ? <span className="animate-pulse text-primary">Running...</span> :
                            <Button variant="ghost"
                                    onClick={clearOutput}
                                    className="hover:text-foreground text-xs underline">
                                <X/>
                            </Button>}
                    </div>
                    {error &&
                        <p className="text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">{error}</p>}


                    {data && resultMode == 'probabilistic' && (
                        <FormattedOutput data={data} estimatedMode={estimatedMode} />
                    )}

                    {data && resultMode == 'quantum' && (
                        <FormattedQuantumOutput data={data} />
                    )}

                    <p>Mode: {resultMode}</p>
                    <p>Command : {resultCommand}</p>
                </div>
            )}


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