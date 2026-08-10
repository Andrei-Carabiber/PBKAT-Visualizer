import { Button } from "@/components/ui/button.tsx";
import { useRunEngine } from "@/store/runEngine.ts";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog.tsx";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import { useState } from "react";

const SaveResultsButton = () => {
    const { formattedData } = useRunEngine();
    const [isSaving, setIsSaving] = useState(false);

    if (!formattedData) return null;

    // --- Helper Function to find the correct element ---
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

    // --- Save as PDF Logic ---
    const handleSavePDF = async () => {
        const element = getTargetElement();
        if (!element) return;

        try {
            setIsSaving(true);

            const dataUrl = await toPng(element, {
                pixelRatio: 2,
                backgroundColor: '#ffffff'
            });

            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();

            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save("quantum-results.pdf");

        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Save as PNG Logic ---
    const handleSavePNG = async () => {
        const element = getTargetElement();
        if (!element) return;

        try {
            setIsSaving(true);

            const dataUrl = await toPng(element, {
                pixelRatio: 2,
                backgroundColor: '#ffffff'
            });

            // 1. Create a temporary anchor element
            const link = document.createElement("a");
            // 2. Set the file name
            link.download = "quantum-results.png";
            // 3. Set the image data as the URL
            link.href = dataUrl;
            // 4. Append, click, and remove to trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Error generating PNG:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Save as Text/JSON Logic ---
    const handleSaveJSON = () => {
        const textData = JSON.stringify(formattedData, null, 2);

        const blob = new Blob([textData], { type: "application/json" }); // Changed type to application/json
        const href = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = href;
        link.download = "results.json";
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="rounded-sm h-full p-2">
                    Save Results
                </Button>
            </DialogTrigger>

            <DialogContent showCloseButton={true} className="w-fit min-w-fit">
                <div className="flex flex-col gap-6">
                    <span className="text-xl font-semibold">
                        Export Results
                    </span>
                    <p className="text-sm text-muted-foreground">
                        Choose how you would like to export your current computation results or graphs.
                    </p>

                    <div className="flex w-full gap-4 mt-2">
                        <Button
                            className="flex-1"
                            onClick={handleSavePDF}
                            disabled={isSaving}
                        >
                            {isSaving ? "Generating PDF..." : "Save as PDF"}
                        </Button>

                        <Button
                            className="flex-1"
                            onClick={handleSavePNG}
                            disabled={isSaving}
                            variant="outline"
                        >
                            {isSaving ? "Generating PNG..." : "Save as PNG"}
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