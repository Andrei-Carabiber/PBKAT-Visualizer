import type { editorSettings } from "@/components/main/text_editor/textEditor";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {Button} from "@/components/ui/button.tsx";

type Props = {
    settings: editorSettings;
    setSettings: React.Dispatch<React.SetStateAction<editorSettings>>;
};


const wrapOptions = [
    { label: "Off", value: "off" },
    { label: "On", value: "on" },
    { label: "Bounded", value: "bounded" },
    { label: "Column", value: "wordWrapColumn" },
] as const;

const CustomizationBar = ({ settings, setSettings }: Props) => {
    return (
        <div className="w-full flex flex-row items-center gap-4 px-3 py-2 bg-primary text-primary-foreground border-b">

            {/* Font Size */}
            <Field>
                <FieldLabel>Size</FieldLabel>
                <Input
                    type="number"
                    className="w-20"
                    value={settings.fontSize}
                    onChange={(e) =>
                        setSettings(s => ({
                            ...s,
                            fontSize: Number(e.target.value)
                        }))
                    }
                />
            </Field>

            {/* Line Height */}
            <Field>
                <FieldLabel>Line</FieldLabel>
                <Input
                    type="number"
                    className="w-20"
                    value={settings.lineHeight}
                    onChange={(e) =>
                        setSettings(s => ({
                            ...s,
                            lineHeight: Number(e.target.value)
                        }))
                    }
                />
            </Field>

            {/* Letter spacing */}
            <Field>
                <FieldLabel>Spacing</FieldLabel>
                <Input
                    type="number"
                    className="w-20"
                    step="0.1"
                    value={settings.letterSpacing}
                    onChange={(e) =>
                        setSettings(s => ({
                            ...s,
                            letterSpacing: Number(e.target.value)
                        }))
                    }
                />
            </Field>

            {/* Word Wrap */}
            <Field>
                <FieldLabel>Wrap</FieldLabel>
                <Select
                    value={settings.wordWrap}
                    onValueChange={(value) =>
                        setSettings(s => ({
                            ...s,
                            wordWrap: value as editorSettings["wordWrap"]
                        }))
                    }
                >
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Word Wrap</SelectLabel>
                            {wrapOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </Field>

            {/* Minimap toggle */}
            <Button
                className="w-fit h-full rounded bg-secondary/10 hover:bg-secondary/30 transition"
                onClick={() =>
                    setSettings(s => ({
                        ...s,
                        minimap: { enabled: !s.minimap.enabled }
                    }))
                }
            >
                Minimap: {settings.minimap.enabled ? "On" : "Off"}
            </Button>

            {/* Smooth scrolling */}
            <Button
                className="w-fit h-full rounded bg-secondary/10 hover:bg-secondary/30 transition"
                onClick={() =>
                    setSettings(s => ({
                        ...s,
                        smoothScrolling: !s.smoothScrolling
                    }))
                }
            >
                Smooth Scroll: {settings.smoothScrolling ? "On" : "Off"}
            </Button>

            {/* Automatic layout */}
            <Button
                className="w-fit h-full rounded bg-secondary/10 hover:bg-secondary/30 transition"
                onClick={() =>
                    setSettings(s => ({
                        ...s,
                        automaticLayout: !s.automaticLayout
                    }))
                }
            >
                <p>Auto Layout: {settings.automaticLayout ? "On" : "Off"}</p>
            </Button>

        </div>
    );
};

export default CustomizationBar;