"use client";

import { useState } from "react";
import { ClipboardCopy } from "lucide-react";

export function CopyReportButton({ report }: { report: string }) {
  const [copied, setCopied] = useState(false);

  async function copyReport() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button className="ghost-button inline-flex items-center gap-2" type="button" onClick={copyReport}>
      <ClipboardCopy size={16} />
      {copied ? "Copied" : "Copy report"}
    </button>
  );
}
