import React, { forwardRef } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`block text-[10px] font-black tracking-widest text-white/50 uppercase mb-1.5 ${className}`} {...props}>
      {children}
    </label>
  );
}

export function FormField({ 
  label, 
  error, 
  success, 
  helperText, 
  children, 
  className 
}: { 
  label?: string; 
  error?: string; 
  success?: boolean; 
  helperText?: string; 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={`space-y-1 relative ${className}`}>
      {label && <Label>{label}</Label>}
      <div className="relative">
        {children}
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
            <AlertCircle size={16} />
          </div>
        )}
        {success && !error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
            <CheckCircle size={16} />
          </div>
        )}
      </div>
      {error ? (
        <p className="text-[10px] font-bold text-red-400 mt-1.5 flex items-center gap-1">
          <AlertCircle size={10} /> {error}
        </p>
      ) : helperText ? (
        <p className="text-[10px] font-medium text-white/40 mt-1.5">{helperText}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-[14px] border bg-white/5 px-4 py-3 text-xs font-bold text-white transition-colors focus:outline-none placeholder:text-white/20
          ${hasError 
            ? "border-red-500/50 focus:border-red-500 focus:bg-red-500/5" 
            : "border-white/10 focus:border-cyan-500 focus:bg-white/10"
          } ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full rounded-[14px] border bg-white/5 px-4 py-3 text-xs font-bold text-white transition-colors focus:outline-none placeholder:text-white/20 min-h-[100px] resize-y
          ${hasError 
            ? "border-red-500/50 focus:border-red-500 focus:bg-red-500/5" 
            : "border-white/10 focus:border-cyan-500 focus:bg-white/10"
          } ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }>(
  ({ className, children, hasError, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full rounded-[14px] border bg-white/5 px-4 py-3 text-xs font-bold text-white transition-colors focus:outline-none appearance-none [&>option]:bg-[#0A0E17] [&>option]:text-white
          ${hasError 
            ? "border-red-500/50 focus:border-red-500 focus:bg-red-500/5" 
            : "border-white/10 focus:border-cyan-500 focus:bg-white/10"
          } ${className}`}
        style={{ colorScheme: "dark" }}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";
