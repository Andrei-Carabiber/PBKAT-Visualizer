import type { editorSettings } from "@/components/main/text_editor/textEditor";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button.tsx";
import RunButton from "@/components/main/text_editor/calculate_button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import {Settings2 } from "lucide-react";

type Props = {
    settings: editorSettings;
    setSettings: React.Dispatch<React.SetStateAction<editorSettings>>;
    panelSize: number;
};

const wrapOptions = [
    { label: "Off", value: "off" },
    { label: "On", value: "on" },
    { label: "Bounded", value: "bounded" },
    { label: "Column", value: "wordWrapColumn" },
] as const;

const CustomizationBar = ({ settings, setSettings, panelSize }: Props) => {

    const numberField = (
        label: string,
        value: number,
        step: string | undefined,
        onChange: (n: number) => void
    ) => (
        <Field className="flex-1">
            <FieldLabel>{label}</FieldLabel>
            <Input
                type="number"
                step={step}
                aria-label={label}
                className="w-full"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </Field>
    );

    // Swap layouts gracefully if the panel width drops below 40%
    const isCollapsed = panelSize < 700;

    if (isCollapsed) {
        return (
            <div className="w-full h-full flex flex-row items-center justify-between gap-2 px-3 py-2 text-card-foreground bg-card border-b">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" aria-label="Editor settings">
                            <Settings2 size={16} />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-64 flex flex-col gap-4 p-4 shadow-lg">
                        <div className="flex gap-2">
                            {numberField("Size", settings.fontSize, undefined, (n) => setSettings(s => ({ ...s, fontSize: n })))}
                            {numberField("Line", settings.lineHeight, undefined, (n) => setSettings(s => ({ ...s, lineHeight: n })))}
                        </div>

                        {numberField("Spacing", settings.letterSpacing, "0.1", (n) => setSettings(s => ({ ...s, letterSpacing: n })))}

                        <Field className="w-full">
                            <FieldLabel>Wrap</FieldLabel>
                            <Select
                                value={settings.wordWrap}
                                onValueChange={(value) => setSettings(s => ({ ...s, wordWrap: value as editorSettings["wordWrap"] }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {wrapOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>

                        <div className="flex flex-col gap-2 pt-2 border-t">
                            <Button size="sm" variant="secondary" className="w-full justify-start" onClick={() => setSettings(s => ({ ...s, smoothScrolling: !s.smoothScrolling }))}>
                                Smooth Scroll: {settings.smoothScrolling ? "On" : "Off"}
                            </Button>
                            <Button size="sm" variant="secondary" className="w-full justify-start" onClick={() => setSettings(s => ({ ...s, automaticLayout: !s.automaticLayout }))}>
                                Auto Layout: {settings.automaticLayout ? "On" : "Off"}
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="h-full">
                    <RunButton />
                </div>
            </div>
        );
    }

    // Standard Expanded View
    return (
        <div className="w-full h-full flex flex-row items-center gap-3 px-3 py-2 text-card-foreground bg-card border-b overflow-x-auto">
            <Field>
                <FieldLabel>Size</FieldLabel>
                <Input type="number" className="w-20" value={settings.fontSize} onChange={(e) => setSettings(s => ({ ...s, fontSize: Number(e.target.value) }))} />
            </Field>

            <Field>
                <FieldLabel>Line</FieldLabel>
                <Input type="number" className="w-20" value={settings.lineHeight} onChange={(e) => setSettings(s => ({ ...s, lineHeight: Number(e.target.value) }))} />
            </Field>

            <Field>
                <FieldLabel>Spacing</FieldLabel>
                <Input type="number" className="w-20" step="0.1" value={settings.letterSpacing} onChange={(e) => setSettings(s => ({ ...s, letterSpacing: Number(e.target.value) }))} />
            </Field>

            <Field className="min-w-[120px]">
                <FieldLabel>Wrap</FieldLabel>
                <Select value={settings.wordWrap} onValueChange={(value) => setSettings(s => ({ ...s, wordWrap: value as editorSettings["wordWrap"] }))}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {wrapOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </Field>

            <div className="flex h-full gap-1 ml-auto items-center">
                <Button className="w-fit h-full rounded-lg" variant="outline" onClick={() => setSettings(s => ({ ...s, smoothScrolling: !s.smoothScrolling }))}>
                    Smooth Scroll: {settings.smoothScrolling ? "On" : "Off"}
                </Button>
                <Button className="w-fit h-full rounded-lg" variant="outline" onClick={() => setSettings(s => ({ ...s, automaticLayout: !s.automaticLayout }))}>
                    Auto Layout: {settings.automaticLayout ? "On" : "Off"}
                </Button>
                <div className="h-full flex items-center">
                    <RunButton />
                </div>
            </div>
        </div>
    );
};

export default CustomizationBar;