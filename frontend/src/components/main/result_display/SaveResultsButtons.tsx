import { Button } from "@/components/ui/button.tsx";
import { useRunEngine } from "@/store/runEngine.ts";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog.tsx";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useState } from "react";

const SaveResultsButton = () => {
    const { data } = useRunEngine();
    const [isSaving, setIsSaving] = useState(false);

    if (!data) return null;

    // --- Save as PDF Logic ---
    const handleSavePDF = async () => {
        const element = document.getElementById("results-container");
        if (!element) return;

        try {
            setIsSaving(true);

            // html2canvas takes a snapshot of the DOM element (including graphs)
            const canvas = await html2canvas(element, {
                scale: 2, // Increases resolution of the captured image
                useCORS: true,
            });

            const imgData = canvas.toDataURL("image/png");

            // Create a new PDF (A4 size)
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            // Calculate height to maintain aspect ratio
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save("quantum-results.pdf");

        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Save as Text/JSON Logic ---
    const handleSaveJSON = () => {
        // Formats the raw data as a nicely indented JSON string
        const textData = JSON.stringify(data, null, 2);

        // Create a blob and download link
        const blob = new Blob([textData], { type: "text/plain" });
        const href = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = href;
        link.download = "results.json";
        document.body.appendChild(link);
        link.click();

        // Cleanup
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

            <DialogContent showCloseButton={true}>
                <div className="flex flex-col gap-6">
                    <span className="text-xl font-semibold">
                        Export Results
                    </span>
                    <p className="text-sm text-muted-foreground">
                        Choose how you would like to export your current computation results and graphs.
                    </p>

                    <div className="flex w-full gap-4 mt-2">
                        <Button
                            className="w-1/2"
                            onClick={handleSavePDF}
                            disabled={isSaving}
                        >
                            {isSaving ? "Generating PDF..." : "Save PDF"}
                        </Button>

                        <Button
                            className="w-1/2"
                            variant="secondary"
                            onClick={handleSaveJSON}
                        >
                            Save JSON
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SaveResultsButton;