import {useCompareStore} from "@/store/useCompareStore";
import {Navigate} from "react-router-dom";
import SmallResultDisplay from "@/components/main/compare_mode/SmallResultDisplay.tsx";

const CompareView = () => {
    const {first, second, clearCompare} = useCompareStore();

    if (!first || !second) {
        clearCompare();
        return <Navigate to="/" replace/>;
    }

    return (
        <div className="flex flex-1 flex-col h-full w-full min-h-0 gap-4 p-4">

            <div className="flex items-center gap-3">

                <h1 className="text-lg font-semibold">
                    Comparing: {first.name} vs {second.name}
                </h1>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                <div className="border rounded-lg p-4 bg-card">
                    <h2 className="font-medium text-base mb-2">
                        {first.name}
                    </h2>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-96">
                        {first.settings.code}
                    </pre>
                    <SmallResultDisplay formattedData={first.settings.result} />
                </div>

                <div className="border rounded-lg p-4 bg-card">
                    <h2 className="font-medium text-base mb-2">
                        {second.name}
                    </h2>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-96">
                        {second.settings.code}
                    </pre>
                    <SmallResultDisplay formattedData={second.settings.result} />


                </div>
            </div>
        </div>
    );
};

export default CompareView;