import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import {Checkbox} from "@/components/ui/checkbox";
import {Label} from "@/components/ui/label";
import {jsPDF} from "jspdf";
import {useEffect, useState} from "react";
import {useCompareStore} from "@/store/useCompareStore";
import {toPng} from "html-to-image";
import {useTheme} from "@/components/theme-provider.tsx";
import type {HistoryItem} from "@/store/runEngine.ts";

const COMPONENT_IDS = {
    result: "result-box-comparison",
    code: "code-box-comparison",
    network: "node-editor-comparison",
    networkGoal: "network-goal-comparison",
    networkCapacity: "network-capacity-comparison",
} as const;

const PADDING = 40;
const GAP = 24;
const TITLE_BLOCK_HEIGHT = 40;

type Capture = {
    label: string;
    img: HTMLImageElement;
};

export const handleSavePDF = (previewUrl: string | null, setIsSaving: (state: boolean) => void) => {
    if (!previewUrl) return;
    try {
        setIsSaving(true);
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(previewUrl);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(previewUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save("quantum-results.pdf");
    } catch (error) {
        console.error("Error generating PDF:", error);
    } finally {
        setIsSaving(false);
    }
};

export const handleSavePNG = (previewUrl: string | null, setIsSaving: (state: boolean) => void) => {
    if (!previewUrl) return;
    try {
        setIsSaving(true);
        const link = document.createElement("a");
        link.download = "quantum-results.png";
        link.href = previewUrl;
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error("Error saving PNG:", error);
    } finally {
        setIsSaving(false);
    }
};

const produceJson = (comparisonObjectsArray: (HistoryItem | null)[], exportOptions: {
    result: boolean,
    code: boolean,
    network: boolean,
    networkGoal: boolean,
    networkCapacity: boolean,
}) => {
    const output: Record<string, unknown> = {};

    comparisonObjectsArray.map((item, index) => {
        if (!item) return
        const {name, settings} = item;
        const {code, result, goal, goalDisabled, networkCapacity, capacityDisabled, graph} = settings
        const {nodes, edges} = graph
        const curatedNodes = nodes.map((node) => {
            let data = node.data
            let {nodeLabel, ...nodeData} = data
            return {
                nodeName: nodeLabel,
                nodeData: nodeData
            }
        })
        console.log(edges)
        const curatedEdges = edges.map((edge) => {
            return {
                name: edge.id,
                edgeData: edge.data
            }
        })
        let curatedItem: Record<string, unknown> = {
            name
        }
        if (exportOptions.code) {
            curatedItem['code'] = code
        }
        if (exportOptions.networkCapacity) {
            curatedItem['networkCapacity'] = networkCapacity
            curatedItem['capacityDisabled'] = capacityDisabled

        }

        if (exportOptions.networkGoal) {
            curatedItem['goal'] = goal
            curatedItem['goalDisabled'] = goalDisabled
        }

        if (exportOptions.result) {
            curatedItem['result'] = result
        }

        if (exportOptions.network) {
            curatedItem['nodes'] = curatedNodes
            curatedItem['edges'] = curatedEdges
        }

        output[`${index}`] = curatedItem
    })
    return output
}

const SaveResultsButton = () => {
    const {first, second} = useCompareStore();
    const {theme} = useTheme();
    const [isSaving, setIsSaving] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    const [exportOptions, setExportOptions] = useState({
        result: true,
        code: false,
        network: false,
        networkGoal: false,
        networkCapacity: false,
    });

    const checkboxConfig = [
        {key: "result", label: "Result"},
        {key: "code", label: "Code"},
        {key: "network", label: "Network"},
        {key: "networkGoal", label: "Network Goal"},
        {key: "networkCapacity", label: "Network Capacity"},
    ] as const;

    const handleOptionChange = (key: keyof typeof exportOptions) => (checked: boolean) => {
        setExportOptions((prev) => ({...prev, [key]: checked}));
    };

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;

        const loadImage = (src: string) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });

        const generatePreview = async () => {
            setIsPreviewLoading(true);

            // Let any pending state/DOM updates settle before capturing.
            await new Promise((resolve) => setTimeout(resolve, 100));
            await document.fonts.ready;

            try {
                const backgroundColor = theme === "dark" ? "#000000" : "#ffffff";
                const selectedKeys = Object.entries(exportOptions)
                    .filter(([, isSelected]) => isSelected)
                    .map(([key]) => key as keyof typeof COMPONENT_IDS);

                if (selectedKeys.length === 0) {
                    if (!cancelled) setPreviewUrl(null);
                    return;
                }

                // IMPORTANT: capture the *live* elements directly, not a cloned copy.
                // cloneNode() does not preserve rendered pixel content for <canvas>
                // (2D or WebGL) or other elements whose visuals are driven by JS/DOM
                // state rather than static markup, which is why the old clone-based
                // approach produced a blank/white export.
                const captures: Capture[] = [];
                for (const key of selectedKeys) {
                    const elementId = COMPONENT_IDS[key];
                    const el = document.getElementById(elementId);
                    if (!el) continue;

                    const dataUrl = await toPng(el, {
                        cacheBust: true,
                        pixelRatio: 2,
                        backgroundColor,
                    });
                    const img = await loadImage(dataUrl);

                    captures.push({
                        label: checkboxConfig.find((c) => c.key === key)?.label ?? key,
                        img,
                    });
                }

                if (cancelled) return;

                if (captures.length === 0) {
                    setPreviewUrl(null);
                    return;
                }

                // Compose all captured sections onto a single canvas, stacked
                // vertically with a title above each section.
                const contentWidth = Math.max(...captures.map((c) => c.img.width));
                const canvasWidth = contentWidth + PADDING * 2;
                const canvasHeight =
                    PADDING * 2 +
                    captures.reduce((sum, c) => sum + TITLE_BLOCK_HEIGHT + c.img.height, 0) +
                    GAP * (captures.length - 1);

                const canvas = document.createElement("canvas");
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) throw new Error("Could not acquire 2D canvas context");

                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);

                const textColor = theme === "dark" ? "#f5f5f5" : "#111111";
                const ruleColor = theme === "dark" ? "#3a3a3a" : "#cccccc";

                let y = PADDING;
                ctx.textBaseline = "top";
                captures.forEach(({label, img}) => {
                    ctx.font = "600 18px sans-serif";
                    ctx.fillStyle = textColor;
                    ctx.fillText(label, PADDING, y);

                    const ruleY = y + 26;
                    ctx.strokeStyle = ruleColor;
                    ctx.beginPath();
                    ctx.moveTo(PADDING, ruleY);
                    ctx.lineTo(canvasWidth - PADDING, ruleY);
                    ctx.stroke();

                    const imgY = y + TITLE_BLOCK_HEIGHT;
                    ctx.drawImage(img, PADDING, imgY);

                    y = imgY + img.height + GAP;
                });

                setPreviewUrl(canvas.toDataURL("image/png"));
            } catch (error) {
                console.error("Failed to generate preview:", error);
                if (!cancelled) setPreviewUrl(null);
            } finally {
                if (!cancelled) setIsPreviewLoading(false);
            }
        };

        generatePreview().then(() => {
            return () => {
                cancelled = true;
            };
        })


    }, [exportOptions, isOpen, theme]);

    const handleSaveJSON = () => {

        const payload = produceJson([first, second], exportOptions);
        const textData = JSON.stringify(payload, null, 2);
        const blob = new Blob([textData], {type: "application/json"});
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = "quantum-results.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(href);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-sm h-4/5 px-2 py-1.5">
                    Save Results
                </Button>
            </DialogTrigger>

            <DialogContent showCloseButton={true} className="w-fit min-w-fit max-w-3xl">
                <div className="flex flex-col gap-6">
                    <div>
                        <span className="text-xl font-semibold">
                            Export Results
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">
                            Choose how you would like to export your current computation results or graphs.
                        </p>
                    </div>

                    {/* Options Grid */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4 bg-muted/20 rounded-md border">
                        {checkboxConfig.map(({key, label}) => (
                            <div key={key} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`export-opt-${key}`}
                                    checked={exportOptions[key]}
                                    onCheckedChange={handleOptionChange(key)}
                                />
                                <Label
                                    htmlFor={`export-opt-${key}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {label}
                                </Label>
                            </div>
                        ))}
                    </div>

                    {/* Preview Window */}
                    <div
                        className="w-full min-w-100 min-h-75 max-h-150 overflow-auto border rounded-md bg-muted/30 flex items-center justify-center p-4">
                        {isPreviewLoading ? (
                            <span className="text-sm text-muted-foreground animate-pulse">
                                Generating preview...
                            </span>
                        ) : previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Export Preview"
                                className="max-w-full h-auto object-contain border shadow-sm"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <span className="text-sm">Preview unavailable</span>
                                <span className="text-xs text-muted-foreground/70">
                                    Select options to generate a preview
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex w-full gap-4 mt-2">
                        <Button
                            className="flex-1"
                            onClick={() => handleSavePDF(previewUrl, setIsSaving)}
                            disabled={isSaving || isPreviewLoading || !previewUrl}
                        >
                            {isSaving ? "Saving..." : "Save as PDF"}
                        </Button>

                        <Button
                            className="flex-1"
                            onClick={() => {
                                handleSavePNG(previewUrl, setIsSaving)
                            }}
                            disabled={isSaving || isPreviewLoading || !previewUrl}
                            variant="outline"
                        >
                            {isSaving ? "Saving..." : "Save as PNG"}
                        </Button>

                        <Button
                            className="flex-1"
                            variant="secondary"
                            onClick={handleSaveJSON}
                        >
                            Save as JSON
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SaveResultsButton;