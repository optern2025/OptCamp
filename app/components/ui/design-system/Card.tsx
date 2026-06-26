import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "glass" | "solid" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  variant = "glass",
  padding = "md",
  className = "",
  children,
  ...props
}: CardProps) {
  const baseStyles = "rounded-xl overflow-hidden";
  
  const variants = {
    glass: "glass-card",
    solid: "bg-surface-900 border border-surface-800",
    elevated: "bg-surface-800 shadow-elevated border border-surface-700",
  };

  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
}
