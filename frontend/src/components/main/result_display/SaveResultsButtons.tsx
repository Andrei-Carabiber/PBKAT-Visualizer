import {Button} from "@/components/ui/button.tsx";
import {useRunEngine} from "@/store/runEngine.ts";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog.tsx";
import {jsPDF} from "jspdf";
import {toPng} from "html-to-image";
import {useState} from "react";
import {useTheme} from "@/components/theme-provider.tsx";

const SaveResultsButton = () => {
    const {formattedData} = useRunEngine();
    const [isSaving, setIsSaving] = useState(false);
    const {theme} = useTheme()

    // 1. Add state for the preview URL and loading status
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

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

    // 2. Generate the image when the dialog opens
    const handleOpenChange = async (open: boolean) => {
        if (open) {
            const element = getTargetElement();
            if (!element) return;

            try {
                setIsPreviewLoading(true);
                const dataUrl = await toPng(element, {
                    pixelRatio: 2,
                    backgroundColor: theme === 'dark' ? '#000000' : '#ffffff'
                });
                setPreviewUrl(dataUrl);
            } catch (error) {
                console.error("Error generating preview:", error);
            } finally {
                setIsPreviewLoading(false);
            }
        } else {
            // Clean up when dialog closes
            setPreviewUrl(null);
        }
    };

    // 3. Update Save PDF to use the already-generated previewUrl
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

    // 4. Update Save PNG to use the already-generated previewUrl
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
        const textData = JSON.stringify(formattedData, null, 2);
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
        <Dialog onOpenChange={handleOpenChange}>
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
    )
        ;
};

export default SaveResultsButton;