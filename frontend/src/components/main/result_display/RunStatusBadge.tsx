import {
    Ban,
    CheckCircle2,
    Clock3,
    LoaderCircle,
    OctagonAlert,
    PauseCircle,
    TimerOff,
} from "lucide-react";
import type {ProtocolJobStatus} from "@/store/runEngine.ts";

interface RunStatusBadgeProps {
    status: ProtocolJobStatus;
    queuePosition?: number;
}

const statusConfiguration: Record<
    ProtocolJobStatus,
    {
        label: string;
        className: string;
        icon: typeof CheckCircle2;
        spinning?: boolean;
    }
> = {
    queued: {
        label: "Queued",
        className:
            "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        icon: Clock3,
    },
    running: {
        label: "Running",
        className:
            "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        icon: LoaderCircle,
        spinning: true,
    },
    completed: {
        label: "Completed",
        className:
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        icon: CheckCircle2,
    },
    failed: {
        label: "Failed",
        className:
            "border-destructive/30 bg-destructive/10 text-destructive",
        icon: OctagonAlert,
    },
    cancelled: {
        label: "Cancelled",
        className:
            "border-muted-foreground/30 bg-muted text-muted-foreground",
        icon: Ban,
    },
    interrupted: {
        label: "Interrupted",
        className:
            "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
        icon: PauseCircle,
    },
    timed_out: {
        label: "Timed out",
        className:
            "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
        icon: TimerOff,
    },
};

const RunStatusBadge = ({
                            status,
                            queuePosition,
                        }: RunStatusBadgeProps) => {
    const configuration = statusConfiguration[status];
    const Icon = configuration.icon;

    return (
        <span
            className={[
                "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2",
                "text-[11px] font-semibold normal-case",
                configuration.className,
            ].join(" ")}
        >
            <Icon
                className={[
                    "h-3.5 w-3.5",
                    configuration.spinning ? "animate-spin" : "",
                ].join(" ")}
            />

            <span>{configuration.label}</span>

            {status === "queued" && queuePosition != null && (
                <span>#{queuePosition}</span>
            )}
        </span>
    );
};

export default RunStatusBadge;