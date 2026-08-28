import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useRunEngine } from "@/store/runEngine.ts";
import { toast } from "sonner";

export type ShareStateType = {
    code: string;
    graph: {
        nodes: any[];
        edges: any[];
    };
    goal: any[];
    goalDisabled: boolean;
    networkCapacity: any[];
    capacityDisabled: boolean;
    truncationActive: boolean;
    truncationCoverageAmount: number;
};

export default function LoadRedirect() {
    const { token } = useParams<{ token: string }>();
    const [isDoneProcessing, setIsDoneProcessing] = useState(false);
    const [hasError, setHasError] = useState(false);

    const {
        setGoalConnections,
        setNetworkCapacityConnections,
        setNetworkCapacityDisabled,
        setNetworkGoalDisabled,
        setPendingSharedState,
        setGraphCallback,
        setUserCodeCallback,
        setTruncationActive,
        setCoverage,
        setTruncation
    } = useRunEngine();

    useEffect(() => {
        if (!token) {
            setHasError(true);
            setIsDoneProcessing(true);
            return;
        }

        const fetchSharedState = async () => {
            try {
                const response = await fetch(`/api/share/${token}`);

                if (!response.ok) {
                    throw new Error("Share link expired or not found");
                }

                const save: ShareStateType = await response.json();

                setGoalConnections(save.goal || []);
                setNetworkCapacityConnections(save.networkCapacity || []);
                setNetworkCapacityDisabled(save.capacityDisabled ?? false);
                setNetworkGoalDisabled(save.goalDisabled ?? false);
                setTruncationActive(save.truncationActive ?? true)

                if ('truncationActive' in save) {
                    if (save.truncationActive) {
                        setTruncation(save.truncationCoverageAmount ?? 100)
                    }
                    else {
                        setCoverage(save.truncationCoverageAmount ?? 0.9)
                    }
                } else {
                    setTruncationActive(true)
                    setTruncation(50)
                }

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
                console.error("Failed to load shareable state:", error);
                toast.error("This share link is invalid or has expired.");
                setHasError(true);
            } finally {
                setIsDoneProcessing(true);
            }
        };

        fetchSharedState();
    }, [
        token,
        setGoalConnections,
        setNetworkCapacityConnections,
        setNetworkCapacityDisabled,
        setNetworkGoalDisabled,
        setPendingSharedState,
        setGraphCallback,
        setUserCodeCallback,
    ]);

    if (!isDoneProcessing) {
        return (
            <div className="w-screen h-screen flex items-center justify-center font-mono text-muted-foreground bg-background">
                Unpacking workspace details...
            </div>
        );
    }

    if (hasError) {
        return <Navigate to="/" replace />;
    }

    return <Navigate to="/" replace />;
}