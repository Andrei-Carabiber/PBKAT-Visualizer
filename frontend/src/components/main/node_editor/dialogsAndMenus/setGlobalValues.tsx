import {useState} from "react";
import {DEFAULT_EDGE_VALUES, DEFAULT_NODE_VALUES} from "@/store/customization.ts";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {useReactFlow} from "@xyflow/react";
import {toast} from "sonner";

type Props = {
    onBack: () => void;
};

type FieldKey =
    | "coherence_time"
    | "create_prob"
    | "create_quality"
    | "swap_prob"
    | "distance"
    | "transmit_prob"
    | "uCreate_quality"
    | "uCreate_prob";

type FieldConfig = {
    label: string;
    target: "node" | "edge";
    min: number;
    max?: number;
    step?: number;
};

const FIELD_CONFIG: Record<FieldKey, FieldConfig> = {
    coherence_time: {label: "Coherence Time", target: "node", min: 0},
    create_prob: {label: "Create Probability", target: "node", min: 0, max: 1, step: 0.1},
    create_quality: {label: "Create Quality", target: "node", min: 0, max: 1, step: 0.1},
    swap_prob: {label: "Swap Probability", target: "node", min: 0, max: 1, step: 0.1},
    distance: {label: "Distance", target: "edge", min: 0},
    transmit_prob: {label: "Transmit Probability", target: "edge", min: 0, max: 1, step: 0.1},
    uCreate_quality: {label: "UCreate Quality", target: "edge", min: 0, max: 1, step: 0.1},
    uCreate_prob: {label: "UCreate Probability", target: "edge", min: 0, max: 1, step: 0.1},
};

const NODE_FIELD_KEYS: FieldKey[] = ["coherence_time", "create_prob", "create_quality", "swap_prob"];
const EDGE_FIELD_KEYS: FieldKey[] = ["distance", "transmit_prob", "uCreate_quality", "uCreate_prob"];
const ALL_FIELD_KEYS: FieldKey[] = [...NODE_FIELD_KEYS, ...EDGE_FIELD_KEYS];

const buildDefaultValues = (): Record<FieldKey, string> => ({
    coherence_time: String(DEFAULT_NODE_VALUES.coherence_time),
    create_prob: String(DEFAULT_NODE_VALUES.create_prob),
    create_quality: String(DEFAULT_NODE_VALUES.create_quality),
    swap_prob: String(DEFAULT_NODE_VALUES.swap_prob),
    distance: String(DEFAULT_EDGE_VALUES.distance),
    transmit_prob: String(DEFAULT_EDGE_VALUES.transmit_prob),
    uCreate_quality: String(DEFAULT_EDGE_VALUES.uCreate_quality),
    uCreate_prob: String(DEFAULT_EDGE_VALUES.uCreate_prob),
});

const buildDefaultChecked = (): Record<FieldKey, boolean> =>
    ALL_FIELD_KEYS.reduce((acc, key) => ({...acc, [key]: false}), {} as Record<FieldKey, boolean>);

const GlobalValuesDialog = ({onBack}: Props) => {
    const {getEdges, getNodes, setNodes, setEdges} = useReactFlow();

    const [values, setValues] = useState<Record<FieldKey, string>>(buildDefaultValues);
    const [checked, setChecked] = useState<Record<FieldKey, boolean>>(buildDefaultChecked);

    const handleValueChange = (key: FieldKey, raw: string) => {
        // Allow users to clear the input
        if (raw === "") {
            setValues((prev) => ({...prev, [key]: raw}));
            return;
        }

        const config = FIELD_CONFIG[key];
        const parsed = Number(raw);

        // Prevent setting state if it isn't a valid number
        if (Number.isNaN(parsed)) return;

        // Prevent values that are less than min or greater than max
        if (parsed < config.min) return;
        if (config.max !== undefined && parsed > config.max) return;

        setValues((prev) => ({...prev, [key]: raw}));
    };

    const handleCheckedChange = (key: FieldKey, isChecked: boolean) => {
        setChecked((prev) => ({...prev, [key]: isChecked}));
    };

    const handleReset = () => {
        setValues(buildDefaultValues());
        setChecked(buildDefaultChecked());
    };

    // Kept as a final safety check before applying (in case of paste edge-cases, etc)
    const validateField = (key: FieldKey): {skip?: boolean; error?: string; value?: number} => {
        const config = FIELD_CONFIG[key];
        const raw = values[key].trim();

        if (raw === "") {
            return {skip: true};
        }

        const parsed = Number(raw);

        if (Number.isNaN(parsed)) {
            return {error: `${config.label} must be a number`};
        }
        if (parsed < config.min) {
            return {error: `${config.label} cannot be less than ${config.min}`};
        }
        if (config.max !== undefined && parsed > config.max) {
            return {error: `${config.label} cannot be more than ${config.max}`};
        }

        return {value: parsed};
    };

    const applyFields = (keys: FieldKey[]) => {
        const errors: string[] = [];
        const nodeUpdates: Partial<Record<FieldKey, number>> = {};
        const edgeUpdates: Partial<Record<FieldKey, number>> = {};

        keys.forEach((key) => {
            const result = validateField(key);

            if (result.error) {
                errors.push(result.error);
                return;
            }
            if (result.skip || result.value === undefined) {
                return;
            }

            if (FIELD_CONFIG[key].target === "node") {
                nodeUpdates[key] = result.value;
            } else {
                edgeUpdates[key] = result.value;
            }
        });

        if (errors.length > 0) {
            toast.error(errors.join(", "));
            return;
        }

        const hasNodeUpdates = Object.keys(nodeUpdates).length > 0;
        const hasEdgeUpdates = Object.keys(edgeUpdates).length > 0;

        if (!hasNodeUpdates && !hasEdgeUpdates) {
            toast.error("No values to apply");
            return;
        }

        if (hasNodeUpdates) {
            const updatedNodes = getNodes().map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    ...nodeUpdates,
                },
            }));
            setNodes(updatedNodes);
        }

        if (hasEdgeUpdates) {
            const updatedEdges = getEdges().map((edge) => ({
                ...edge,
                data: {
                    ...edge.data,
                    ...edgeUpdates,
                },
            }));
            setEdges(updatedEdges);
        }

        toast.success("Successfully applied values");
        onBack();
    };

    const handleApplyAll = () => applyFields(ALL_FIELD_KEYS);
    const handleApplySelected = () => applyFields(ALL_FIELD_KEYS.filter((key) => checked[key]));

    const checkedAmount = ALL_FIELD_KEYS.filter((key) => checked[key]).length;

    const renderField = (key: FieldKey) => {
        const config = FIELD_CONFIG[key];
        return (
            <div key={key} className="grid gap-1.5">
                <Label htmlFor={`field-${key}`}>{config.label}</Label>
                <div className="flex items-center gap-2">
                    <Checkbox
                        id={`check-${key}`}
                        checked={checked[key]}
                        onCheckedChange={(isChecked) => handleCheckedChange(key, Boolean(isChecked))}
                    />
                    <Input
                        id={`field-${key}`}
                        type="number"
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        placeholder="—"
                        value={values[key]}
                        onChange={(e) => handleValueChange(key, e.target.value)}
                        onKeyDown={(e) => {
                            // Physically block keystrokes for -, +, e, and E so users can't start typing bad formats
                            if (["-", "+", "e", "E"].includes(e.key)) {
                                e.preventDefault();
                            }
                        }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 py-2">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* Nodes Section */}
                <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Node Values</h4>
                    <div className="grid gap-3">
                        {NODE_FIELD_KEYS.map(renderField)}
                    </div>
                </div>

                {/* Edges Section */}
                <div className="space-y-3 pt-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Edge Values</h4>
                    <div className="grid gap-3">
                        {EDGE_FIELD_KEYS.map(renderField)}
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
                <div className="flex gap-2">
                    <Button className="rounded-sm p-4" variant="outline" onClick={handleReset}>
                        Reset
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button className="rounded-sm p-4" variant="outline" onClick={onBack}>
                        Cancel
                    </Button>
                    <Button
                        className="rounded-sm p-4"
                        variant="outline"
                        onClick={handleApplySelected}
                        disabled={checkedAmount === 0}
                    >
                        Apply {checkedAmount}
                    </Button>
                    <Button className="rounded-sm p-4" onClick={handleApplyAll}>
                        Apply All
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default GlobalValuesDialog;