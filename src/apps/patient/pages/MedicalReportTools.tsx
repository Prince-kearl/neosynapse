import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Share2, Download } from "lucide-react";

interface MedicalReportToolsProps {
  markdown: string;
  json: any;
}

export const MedicalReportTools: React.FC<MedicalReportToolsProps> = ({ markdown, json }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const reportTitle = typeof json?.title === "string" ? json.title : "Clinical Assessment and Triage Report";
  const filePrefix = reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "clinical-report";

  useEffect(() => {
    let mounted = true;
    void import("marked").then(({ marked }) => {
      if (mounted) setHtmlContent(marked.parse(markdown) as string);
    });
    return () => {
      mounted = false;
    };
  }, [markdown]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    const { default: html2pdf } = await import("html2pdf.js");
    const fileName = `${filePrefix}-${new Date().toISOString().slice(0, 10)}.pdf`;
    html2pdf().from(reportRef.current).set({
      margin: 0.45,
      filename: fileName,
      html2canvas: { scale: 2, backgroundColor: "#ffffff" },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    }).save();
  };

  const handleShare = async () => {
    if (!reportRef.current) return;

    const fileName = `${filePrefix}-${new Date().toISOString().slice(0, 10)}.pdf`;
    const opt = {
      margin: 0.45,
      filename: fileName,
      html2canvas: { scale: 2, backgroundColor: "#ffffff" },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const pdfBlob = await html2pdf().from(reportRef.current).set(opt).outputPdf("blob");
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      if (!navigator.share) {
        toast({ title: "Share not supported", description: "Downloading PDF instead." });
        await handleDownloadPDF();
        return;
      }

      const canShareFile = (navigator as any).canShare?.({ files: [file] }) ?? true;
      if (!canShareFile) {
        toast({ title: "Share not supported", description: "Downloading PDF instead." });
        await handleDownloadPDF();
        return;
      }

      await navigator.share({ title: reportTitle, files: [file] });
    } catch {
      toast({ title: "Share unavailable", description: "Downloading PDF instead." });
      await handleDownloadPDF();
    }
  };

  return (
    <div className="my-6">
      <div
        ref={reportRef}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        className="prose prose-slate max-w-none rounded-md border border-slate-300 bg-white p-5 text-slate-950 shadow-sm [&_h1]:text-blue-900 [&_h1]:border-b [&_h1]:border-blue-800 [&_h1]:pb-2 [&_h2]:text-blue-900 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-blue-50 [&_th]:p-2"
      />
      <div className="flex gap-3 mt-4">
        <Button onClick={handleDownloadPDF} variant="outline"><Download className="w-4 h-4 mr-2" />Download PDF</Button>
        <Button onClick={handleShare} variant="outline"><Share2 className="w-4 h-4 mr-2" />Share</Button>
      </div>
    </div>
  );
};
