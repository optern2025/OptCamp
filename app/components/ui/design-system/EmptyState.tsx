import React from "react";
import { Card } from "./Card";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <Card variant="glass" padding="lg" className="flex flex-col items-center justify-center text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center text-surface-400 mb-6 border border-surface-700">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-surface-400 max-w-sm mx-auto mb-8 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </Card>
  );
}
