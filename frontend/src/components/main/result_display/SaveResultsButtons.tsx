import {Button} from "@/components/ui/button.tsx";
import {useRunEngine} from "@/store/runEngine.ts";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Label} from "@/components/ui/label.tsx";
import {jsPDF} from "jspdf";
import {toPng} from "html-to-image";
import {useState} from "react";
import {useTheme} from "@/components/theme-provider.tsx";
import {EDITABLE_END_MARKER, EDITABLE_START_MARKER} from "@/components/main/text_editor/haskellBoilerplate.ts";

const SaveResultsButton = () => {
    const {formattedData} = useRunEngine();
    const [isSaving, setIsSaving] = useState(false);
    const {theme} = useTheme()

    const [isOpen, setIsOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const {getCodeCallback} = useRunEngine();

    const [includeCode, setIncludeCode] = useState(false);

    const rawCode = getCodeCallback ? getCodeCallback() : "Couldn't load protocol";

    const userCode = rawCode.split(EDITABLE_END_MARKER)[0].replaceAll("\n\n", "\n")
        .split(EDITABLE_START_MARKER)[1]
    const network = rawCode.split("actionConfig = PAC")[1].split("goal :: ProbBellKATTest\n")[0]

    const code = (userCode + "\n" + network).replace(/\n{2,}/g, "\n");

    if (!formattedData) return null;

    const getTargetElement = () => {
        if (formattedData.mode === "run") {
            return document.getElementById("run-output");
        } else if (formattedData.mode === "probability") {
            return document.getElementById("probability-output");
        } else if (formattedData.mode === 'probOnly') {
            return document.getElementById("quantum-probability-output");
        } else {
            return document.getElementById("quantum-output");
        }
    };

    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
        const lines: string[] = [];

        text.split("\n").forEach((rawLine) => {
            if (rawLine.trim() === "") {
                lines.push("");
                return;
            }

            let currentLine = "";
            rawLine.split(" ").forEach((word) => {
                // Break up any single word that's wider than maxWidth on its own.
                if (ctx.measureText(word).width > maxWidth) {
                    if (currentLine) {
                        lines.push(currentLine);
                        currentLine = "";
                    }
                    let chunk = "";
                    for (const char of word) {
                        const testChunk = chunk + char;
                        if (ctx.measureText(testChunk).width > maxWidth && chunk) {
                            lines.push(chunk);
                            chunk = char;
                        } else {
                            chunk = testChunk;
                        }
                    }
                    currentLine = chunk;
                    return;
                }

                const testLine = currentLine ? `${currentLine} ${word}` : word;
                if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });
            lines.push(currentLine);
        });

        return lines;
    };

    const buildPreview = async (withCode: boolean) => {
        const element = getTargetElement();
        if (!element) return null;

        const backgroundColor = theme === 'dark' ? '#000000' : '#ffffff';

        const graphDataUrl = await toPng(element, {
            pixelRatio: 2,
            backgroundColor
        });

        if (!withCode || !code) return graphDataUrl;

        const graphImg = await loadImage(graphDataUrl);

        const padding = 32;
        const fontSize = 22;
        const lineHeight = fontSize * 1.5;
        const font = `${fontSize}px monospace`;

        const measureCanvas = document.createElement("canvas");
        const measureCtx = measureCanvas.getContext("2d");
        if (!measureCtx) return graphDataUrl;
        measureCtx.font = font;

        const maxTextWidth = graphImg.width - padding * 2;
        const lines = wrapText(measureCtx, code, maxTextWidth);

        const codeBlockHeight = padding * 2 + lines.length * lineHeight;

        const canvas = document.createElement("canvas");
        canvas.width = graphImg.width;
        canvas.height = codeBlockHeight + padding + graphImg.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return graphDataUrl;

        // Base background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Code block background (top)
        const codeBg = theme === 'dark' ? '#111111' : '#FFFFFF';
        const codeTextColor = theme === 'dark' ? '#e5e5e5' : '#111111';
        ctx.fillStyle = codeBg;
        ctx.fillRect(0, 0, canvas.width, codeBlockHeight);

        // Code text
        ctx.fillStyle = codeTextColor;
        ctx.font = font;
        ctx.textBaseline = "top";
        lines.forEach((line, i) => {
            ctx.fillText(
                line,
                padding,
                padding / 2 + i * lineHeight
            );
        });

        // Graph/result image (below the code block)
        ctx.drawImage(graphImg, 0, codeBlockHeight + padding);

        return canvas.toDataURL("image/png");
    };

    const regeneratePreview = async (withCode: boolean) => {
        try {
            setIsPreviewLoading(true);
            const dataUrl = await buildPreview(withCode);
            setPreviewUrl(dataUrl);
        } catch (error) {
            console.error("Error generating preview:", error);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const handleOpenChange = async (open: boolean) => {
        setIsOpen(open);
        if (open) {
            await regeneratePreview(includeCode);
        } else {
            setPreviewUrl(null);
        }
    };

    const handleIncludeCodeChange = async (checked: boolean) => {
        setIncludeCode(checked);
        if (isOpen) {
            await regeneratePreview(checked);
        }
    };

    const handleSavePDF = () => {
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

    const handleSavePNG = () => {
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

    const handleSaveJSON = () => {
        const payload = includeCode ? {code, ...formattedData} : formattedData;
        const textData = JSON.stringify(payload, null, 2);
        const blob = new Blob([textData], {type: "application/json"});
        const href = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = href;
        link.download = "results.json";
        document.body.appendChild(link);
        link.click();

        link.remove();
        URL.revokeObjectURL(href);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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

                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="include-code"
                            checked={includeCode}
                            onCheckedChange={(checked) => handleIncludeCodeChange(checked === true)}
                            disabled={isPreviewLoading}
                        />
                        <Label htmlFor="include-code" className="text-sm cursor-pointer">
                            Include code in export
                        </Label>
                    </div>

                    <div
                        className="w-full min-w-[400px] min-h-[200px] max-h-[400px] overflow-auto border rounded-md bg-muted/30 flex items-center justify-center p-4">
                        {isPreviewLoading ? (
                            <span className="text-sm text-muted-foreground animate-pulse">
                                Generating preview...
                            </span>
                        ) : (
                            <>
                                {previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt="Export Preview"
                                        className="max-w-full h-auto object-contain border shadow-sm"
                                    />
                                ) : (
                                    <span className="text-sm text-muted-foreground">
                                Preview unavailable
                            </span>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex w-full gap-4 mt-2">
                        <Button
                            className="flex-1"
                            onClick={handleSavePDF}
                            disabled={isSaving || isPreviewLoading || !previewUrl}
                        >
                            {isSaving ? "Saving..." : "Save as PDF"}
                        </Button>

                        <Button
                            className="flex-1"
                            onClick={handleSavePNG}
                            disabled={isSaving || isPreviewLoading || !previewUrl}
                            variant="outline"
                        >
                            {isSaving ? "Saving..." : "Save as PNG"}
                        </Button>

                        <Button
                            className="flex-1"
                            variant="outline"
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