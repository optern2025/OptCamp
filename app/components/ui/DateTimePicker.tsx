"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, X, Check, Zap } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function istInputToDate(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v + ":00+05:30");
  return isNaN(d.getTime()) ? null : d;
}

export function dateToISTInput(d: Date | null): string {
  if (!d) return "";
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return ist.toISOString().slice(0, 16);
}

export function istInputToDisplay(v: string): string {
  if (!v) return "";
  const d = istInputToDate(v);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(d) + " IST";
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  minValue?: string;
  className?: string;
  id?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DateTimePicker({
  value, onChange, label, placeholder = "Select date & time", minValue, className = "", id,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS);
  const initialDate = value ? istInputToDate(value) : null;

  const [viewYear, setViewYear]   = useState(initialDate ? new Date(initialDate.getTime() + IST_OFFSET_MS).getFullYear() : nowIST.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate ? new Date(initialDate.getTime() + IST_OFFSET_MS).getMonth()    : nowIST.getMonth());

  const selectedDateStr = value ? value.slice(0, 10) : "";
  const selectedTime    = value ? value.slice(11, 16) : "09:00";

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (value) {
      const [y, m] = value.slice(0, 10).split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const t = selectedTime || "09:00";
    onChange(`${viewYear}-${mm}-${dd}T${t}`);
  };

  const selectTime = (t: string) => {
    if (!selectedDateStr) {
      const todayIST = `${nowIST.getFullYear()}-${String(nowIST.getMonth()+1).padStart(2,"0")}-${String(nowIST.getDate()).padStart(2,"0")}`;
      onChange(`${todayIST}T${t}`);
    } else {
      onChange(`${selectedDateStr}T${t}`);
    }
  };

  const quickPreset = (preset: string) => {
    const base = new Date(now.getTime() + IST_OFFSET_MS);
    let target: Date;
    switch (preset) {
      case "today":     target = base; break;
      case "tomorrow":  target = new Date(base.getTime() + 86400000); break;
      case "+7d":       target = new Date(base.getTime() + 7*86400000); break;
      default:          target = base;
    }
    const y = target.getFullYear();
    const m = String(target.getMonth()+1).padStart(2,"0");
    const d = String(target.getDate()).padStart(2,"0");
    const t = selectedTime || "09:00";
    onChange(`${y}-${m}-${d}T${t}`);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth);
  const firstDay     = getFirstDayOfMonth(viewYear, viewMonth);
  const cells        = Array(firstDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayYMD = `${nowIST.getFullYear()}-${String(nowIST.getMonth()+1).padStart(2,"0")}-${String(nowIST.getDate()).padStart(2,"0")}`;
  const [selHour, selMin] = selectedTime.split(":").map(Number);
  const displayText = value ? istInputToDisplay(value) : "";

  return (
    <div ref={containerRef} className={`relative ${className}`} id={id}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm transition-all
          ${open
            ? "border-cyan-500/60 bg-[#0A1A24] shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            : "border-white/[0.10] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
          }`}
      >
        <Calendar className={`w-4 h-4 shrink-0 ${value ? "text-cyan-400" : "text-white/30"}`} />
        <span className={`flex-1 text-left truncate font-medium ${value ? "text-white" : "text-white/40"}`}>
          {displayText || placeholder}
        </span>
        {value && (
          <span
            onClick={clear}
            className="text-white/30 hover:text-white/70 transition-colors p-1 rounded-md hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-[200] top-[calc(100%+8px)] left-0 w-[320px] 
          rounded-xl border border-white/[0.10] bg-[#0A0D12]/95 backdrop-blur-2xl
          shadow-[0_20px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(6,182,212,0.05)]
          overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06] bg-white/[0.01]">
            <Zap className="w-3.5 h-3.5 text-cyan-400/70" />
            {[
              { label: "Today", key: "today" },
              { label: "Tomorrow", key: "tomorrow" },
              { label: "Next Wk", key: "+7d" }
            ].map(p => (
              <button
                key={p.key} type="button" onClick={() => quickPreset(p.key)}
                className="text-[11px] font-semibold text-white/60 hover:text-cyan-400 
                  bg-white/[0.04] hover:bg-cyan-500/15 border border-white/[0.04] hover:border-cyan-500/30
                  px-2 py-1 rounded-md transition-all flex-1"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar Header */}
          <div className="p-3 pb-1">
            <div className="flex items-center justify-between mb-3 px-1">
              <button type="button" onClick={prevMonth} className="p-1 rounded-md hover:bg-white/[0.08] text-white/60 hover:text-white">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-sm font-bold text-white tracking-wide">
                {MONTHS[viewMonth]} <span className="text-white/40 font-medium ml-1">{viewYear}</span>
              </div>
              <button type="button" onClick={nextMonth} className="p-1 rounded-md hover:bg-white/[0.08] text-white/60 hover:text-white">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => <div key={d} className="text-center text-[10px] font-bold text-white/30 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (!day) return <div key={idx} />;
                const cellYMD = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const isToday    = cellYMD === todayYMD;
                const isSelected = cellYMD === selectedDateStr;
                const minYMD = minValue ? minValue.slice(0,10) : null;
                const isPast = minYMD ? cellYMD < minYMD : false;

                return (
                  <button
                    key={idx} type="button" disabled={isPast} onClick={() => selectDay(day)}
                    className={`relative w-8 h-8 rounded-lg text-xs font-semibold mx-auto transition-all
                      flex items-center justify-center
                      ${isPast ? "text-white/10 cursor-not-allowed" :
                        isSelected
                          ? "bg-cyan-500 text-[#0A0D12] shadow-[0_0_12px_rgba(6,182,212,0.4)] font-bold"
                          : isToday
                            ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"
                            : "text-white/70 hover:bg-white/[0.08] hover:text-white"
                      }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Picker */}
          <div className="p-3 pt-2 border-t border-white/[0.06] bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-white/40" />
                <span className="text-xs font-semibold text-white/50">Time</span>
              </div>
              <div className="flex items-center gap-1 bg-[#0A0D12] border border-white/[0.10] rounded-lg p-1">
                <input
                  type="number" min={0} max={23}
                  value={String(selHour).padStart(2,"0")}
                  onChange={e => {
                    const h = Math.min(23, Math.max(0, Number(e.target.value)));
                    selectTime(`${String(h).padStart(2,"0")}:${String(selMin).padStart(2,"0")}`);
                  }}
                  className="w-8 text-center bg-transparent text-white text-xs font-bold focus:outline-none focus:text-cyan-400"
                />
                <span className="text-white/30 font-bold">:</span>
                <input
                  type="number" min={0} max={59}
                  value={String(selMin).padStart(2,"0")}
                  onChange={e => {
                    const m = Math.min(59, Math.max(0, Number(e.target.value)));
                    selectTime(`${String(selHour).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
                  }}
                  className="w-8 text-center bg-transparent text-white text-xs font-bold focus:outline-none focus:text-cyan-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
