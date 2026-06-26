import React from "react";
import { Card } from "./Card";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
}

export function MetricCard({ title, value, description, trend, icon }: MetricCardProps) {
  return (
    <Card variant="glass" padding="md" className="relative overflow-hidden group hover:border-surface-600 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-surface-400">{title}</h3>
        {icon && <div className="text-surface-400 group-hover:text-primary-400 transition-colors">{icon}</div>}
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-white">{value}</span>
        
        {trend && (
          <span className={`text-sm font-medium ${trend.isPositive ? 'text-status-success' : 'text-status-danger'}`}>
            {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
      
      {description && (
        <p className="text-sm text-surface-400 mt-2">{description}</p>
      )}

      {/* Decorative gradient blur in background */}
      <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-colors pointer-events-none" />
    </Card>
  );
}
