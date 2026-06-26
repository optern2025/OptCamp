"use client";

import { Printer, Download } from "lucide-react";
import { Button } from "@/app/components/ui/design-system";
// We dynamically import html2pdf so it only loads on the client
import { useState } from "react";

export default function PrintButton() {
  const [loading, setLoading] = useState(false);

  const handleDownloadPDF = async () => {
    setLoading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById("certificate-container");
      if (!element) throw new Error("Certificate container not found");
      
      const opt = {
        margin:       0,
        filename:     'certificate.pdf',
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' as const }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error(e);
      // Fallback to print if html2pdf fails
      window.print();
    }
    setLoading(false);
  };

  return (
    <div className="flex gap-3">
      <Button variant="secondary" onClick={() => window.print()}>
        <Printer className="w-4 h-4 mr-2" /> Print
      </Button>
      <Button variant="primary" onClick={handleDownloadPDF} isLoading={loading}>
        <Download className="w-4 h-4 mr-2" /> Download PDF
      </Button>
    </div>
  );
}
