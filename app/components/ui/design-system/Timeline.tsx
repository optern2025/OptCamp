import React from "react";

export interface TimelineEvent {
  id: string;
  title: string;
  date?: string;
  description?: string;
  icon?: React.ReactNode;
  status?: "default" | "active" | "success" | "warning" | "error";
}

const STATUS_COLORS = {
  default: "bg-surface-800 text-surface-400 border-surface-700",
  active: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  error: "bg-red-500/10 text-red-400 border-red-500/30"
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events?.length) return null;

  return (
    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
      {events.map((event, index) => (
        <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 bg-[#0B0F14] ml-0 translate-x-0 md:ml-auto md:mr-auto">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${STATUS_COLORS[event.status || "default"]}`}>
              {event.icon ? event.icon : <div className="w-2 h-2 rounded-full bg-current" />}
            </div>
          </div>
          
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-[16px] border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-white text-sm">{event.title}</h4>
              {event.date && <span className="text-[10px] font-mono text-white/40">{event.date}</span>}
            </div>
            {event.description && <p className="text-xs text-white/60 leading-relaxed">{event.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
