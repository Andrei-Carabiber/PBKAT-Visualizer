import TextEditor from "@/components/main/text_editor/textEditor.tsx";
import NodeEditor from "@/components/main/node_editor/nodeEditor.tsx";
import {useRunEngine} from "@/store/runEngine";
import {X} from 'lucide-react'
import {Button} from "@/components/ui/button.tsx";
import {Group, Panel, Separator} from "react-resizable-panels";
import {useState} from "react";
import {Switch} from "@/components/ui/switch.tsx";
import {Label} from "@/components/ui/label.tsx";

const splitData = (data:string) => {
    const connections = data.slice(1,-1).split("+")

    const formattedConnections = connections.map((string) => {return string.split("@()×")})

    return formattedConnections
}

const formatDataFull = (data:string) => {

    let connections = splitData(data)
    connections = connections.map((connection:string[]) => {
        const prob = connection[1].split("%")
        const enumerator = prob[0];
        const denominator = prob[1];
        return [connection[0], enumerator, denominator]
    })

    return connections

}

const formatDataEstimated = (data:string) => {
    let connections = splitData(data)
    let formattedConnections = connections.map((connection : string[]) => {
        const prob = connection[1].split("%")
        if (Number.isNaN(prob[0]) || Number.isNaN(prob[1])) {
            return ["There was an error", ""]
        }

        const estimatedProb = (Number(prob[0]) / Number(prob[1]) * 100).toFixed(3)

        return [connection[0], estimatedProb]
    })

    return formattedConnections
}

const Fraction = ({ numerator, denominator }: { numerator: string; denominator: string }) => {
    return (
        <span className="inline-flex flex-col items-center justify-center align-middle mx-1 text-xs">
            <span className="px-1 text-[11px] leading-none">{numerator}</span>
            <span className="w-full h-[1px] bg-foreground/60 my-[2px]" />
            <span className="px-1 text-[11px] leading-none">{denominator}</span>
    </span>
    );
};

const MainView = () => {
    const {data, error, loading, clearOutput} = useRunEngine();

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
                                        onCheckedChange={(checked) => setEstimatedMode(checked)} />
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


                    {data && (
                        <div className="flex flex-col gap-2 bg-background p-4 rounded-lg border shadow-inner">
                            {estimatedMode ? (
                                formatDataEstimated(data).map((connection: string[], index) => (
                                    <div key={index} className="flex items-center gap-2 py-1 border-b last:border-0 border-muted/50">
                                        <span className="text-muted-foreground">Connection:</span>
                                        <span className="font-semibold bg-muted px-2 py-0.5 rounded text-xs">{connection[0]}</span>
                                        <span className="text-muted-foreground">|</span>
                                        <span className="text-muted-foreground">Estimated Probability:</span>
                                        <span className="font-bold text-primary">{connection[1]}%</span>
                                    </div>
                                ))
                            ) : (
                                formatDataFull(data).map((connection: string[], index) => (
                                    <div key={index} className="flex items-center gap-2 py-1 border-b last:border-0 border-muted/50">
                                        <span className="text-muted-foreground">Connection:</span>
                                        <span className="font-semibold bg-muted px-2 py-0.5 rounded text-xs">{connection[0]}</span>
                                        <span className="text-muted-foreground">|</span>
                                        <span className="text-muted-foreground">Probability:</span>
                                        <Fraction numerator={connection[1]} denominator={connection[2]} />
                                    </div>
                                ))
                            )}
                        </div>
                    )}
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