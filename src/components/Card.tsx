import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  const base =
    "bg-surface rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)]";
  const interactive = onClick ? "cursor-pointer hover:shadow-md transition-shadow" : "";

  return (
    <div className={`${base} ${interactive} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
