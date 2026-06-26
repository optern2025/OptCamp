"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (toast: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...t, id }]);

    if (t.duration !== 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, t.duration || 5000);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((title: string, description?: string) => addToast({ type: "success", title, description }), [addToast]);
  const error = useCallback((title: string, description?: string) => addToast({ type: "error", title, description, duration: 8000 }), [addToast]);
  const info = useCallback((title: string, description?: string) => addToast({ type: "info", title, description }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      <div className="fixed bottom-0 right-0 z-[100] m-6 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-[16px] border p-4 shadow-2xl transition-all animate-in slide-in-from-bottom-5 fade-in duration-300
              ${t.type === "success" ? "border-emerald-500/30 bg-[#0B0F14] text-white" : ""}
              ${t.type === "error" ? "border-red-500/30 bg-[#0B0F14] text-white" : ""}
              ${t.type === "info" ? "border-cyan-500/30 bg-[#0B0F14] text-white" : ""}
            `}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === "success" && <CheckCircle className="text-emerald-400" size={18} />}
              {t.type === "error" && <AlertCircle className="text-red-400" size={18} />}
              {t.type === "info" && <Info className="text-cyan-400" size={18} />}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold tracking-wide">{t.title}</h4>
              {t.description && <p className="mt-1 text-xs text-white/50">{t.description}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
