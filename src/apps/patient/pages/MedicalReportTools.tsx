import React, { useRef } from "react";
// You may need to install html2pdf.js and marked:
// npm install html2pdf.js marked
import html2pdf from "html2pdf.js";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Share2, Download } from "lucide-react";
import { marked } from "marked";

interface MedicalReportToolsProps {
  markdown: string;
  json: any;
}

export const MedicalReportTools: React.FC<MedicalReportToolsProps> = ({ markdown, json }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const htmlContent = marked.parse(markdown);

  const handleDownloadPDF = () => {
    if (!reportRef.current) return;
    html2pdf().from(reportRef.current).save("AI_Medical_Report.pdf");
  };

  const handleShare = async () => {
    if (!navigator.share) {
      toast({ title: "Share not supported", description: "Web Share API is not available on this device." });
      return;
    }
    if (!reportRef.current) return;
    const opt = { margin: 0.5, filename: "AI_Medical_Report.pdf", html2canvas: {}, jsPDF: { unit: "in", format: "a4", orientation: "portrait" } };
    const pdfBlob = await html2pdf().from(reportRef.current).set(opt).outputPdf("blob");
    const file = new File([pdfBlob], "AI_Medical_Report.pdf", { type: "application/pdf" });
    try {
      await navigator.share({ title: "AI Medical Report", files: [file] });
    } catch (e) {
      toast({ title: "Share cancelled or failed" });
    }
  };

  return (
    <div className="my-6">
      <div ref={reportRef} dangerouslySetInnerHTML={{ __html: htmlContent }} className="prose prose-invert max-w-none border rounded-xl p-4 bg-background/80 shadow" />
      <div className="flex gap-3 mt-4">
        <Button onClick={handleDownloadPDF} variant="outline"><Download className="w-4 h-4 mr-2" />Download PDF</Button>
        <Button onClick={handleShare} variant="outline"><Share2 className="w-4 h-4 mr-2" />Share</Button>
      </div>
    </div>
  );
};
