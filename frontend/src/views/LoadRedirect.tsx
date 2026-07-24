import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useRunEngine } from "@/store/runEngine.ts";

export default function LoadRedirect() {
    const { token } = useParams<{ token: string }>();
    const [isDoneProcessing, setIsDoneProcessing] = useState(false);

    const {
        setActiveConnections,
        setNetworkCapacityConnections,
        setNetworkCapacityDisabled,
        setNetworkGoalDisabled,
        setPendingSharedState,
        setGraphCallback,
        setUserCodeCallback,
        setSelectedCommand
    } = useRunEngine();

    useEffect(() => {
        if (!token) {
            setIsDoneProcessing(true);
            return;
        }

        try {
            const jsonStr = decodeURIComponent(atob(token));
            const save = JSON.parse(jsonStr);

            setActiveConnections(save.goal || []);
            setNetworkCapacityConnections(save.networkCapacity || []);
            setNetworkCapacityDisabled(save.capacityDisabled ?? false);
            setNetworkGoalDisabled(save.goalDisabled ?? false);
            setSelectedCommand(save.mode ?? 'run')

            if (setGraphCallback && setUserCodeCallback && save.graph && save.code) {
                setGraphCallback(save.graph.nodes, save.graph.edges);
                setUserCodeCallback(save.code);
            } else {
                setPendingSharedState({
                    code: save.code || "",
                    graph: save.graph || { nodes: [], edges: [] },
                });
            }
        } catch (error) {
            console.error("Failed to parse shareable token:", error);
        } finally {
            setIsDoneProcessing(true);
        }
    }, [
        token,
        setActiveConnections,
        setNetworkCapacityConnections,
        setNetworkCapacityDisabled,
        setNetworkGoalDisabled,
        setPendingSharedState,
        setGraphCallback,
        setUserCodeCallback,
        setSelectedCommand
    ]);

    if (!isDoneProcessing) {
        return (
            <div className="w-screen h-screen flex items-center justify-center font-mono text-muted-foreground bg-background">
                Unpacking workspace details...
            </div>
        );
    }

    return <Navigate to="/" replace />;
}