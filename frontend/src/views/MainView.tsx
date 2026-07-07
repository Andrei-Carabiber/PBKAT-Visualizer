import TextEditor from "@/components/main/text_editor/textEditor.tsx";
import NodeEditor from "@/components/main/node_editor/nodeEditor.tsx";
import {useRunEngine} from "@/store/runEngine";
import {X} from 'lucide-react'
import {Button} from "@/components/ui/button.tsx";

const MainView = () => {
    const {data, error, loading, clearOutput} = useRunEngine();

    return (
        <div className="flex flex-1 flex-col min-h-full gap-4">
            {(data || error || loading) && (
                <div
                    className="w-full bg-muted/40 border rounded-xl p-4 max-h-60 overflow-y-auto font-mono text-sm shadow-sm">
                    <div
                        className="flex items-center justify-between pb-2 mb-2 border-b text-xs uppercase text-muted-foreground">
                        <span className="font-semibold">Output</span>
                        {loading ? <span className="animate-pulse text-primary">Running...</span> :
                            <Button variant="ghost"
                                    onClick={clearOutput}
                                    className="hover:text-foreground text-xs underline">
                                <X/>
                            </Button>}
                    </div>
                    {error &&
                        <p className="text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">{error}</p>}
                    {data && <pre
                        className="whitespace-pre-wrap bg-background p-3 rounded-lg border shadow-inner">{data}</pre>}
                </div>
            )}

            <div className="flex flex-1 gap-4">
                <TextEditor/>
                <NodeEditor/>
            </div>
        </div>
    );
};

export default MainView;