import TextEditor from "@/components/main/text_editor/textEditor.tsx";
import NodeEditor from "@/components/main/node_editor/nodeEditor.tsx";

const MainView = () => {
    return (
        <div className="flex flex-1 min-h-full gap-4">
            <TextEditor />
            <NodeEditor />
        </div>
    );
};

export default MainView;
