"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/app/components/ui/design-system";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Cohort Admin Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-[#0B0F14] border border-red-500/10 rounded-[24px] mt-8">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-white/40 max-w-md mb-8">
        We encountered an error while loading this section. You can try reloading, or select a different section from the sidebar.
      </p>
      <div className="flex gap-4">
        <Button onClick={reset} className="flex items-center gap-2">
          <RefreshCcw size={16} /> Try Again
        </Button>
      </div>
      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 p-4 bg-black/50 rounded-lg text-left max-w-2xl overflow-auto w-full">
          <p className="text-red-400 font-mono text-sm">{error.message}</p>
        </div>
      )}
    </div>
  );
}
