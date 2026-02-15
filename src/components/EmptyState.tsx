import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      {icon && <div className="text-text/30 mb-4 flex justify-center">{icon}</div>}
      <h3 className="text-lg font-medium text-text/70 mb-1">{title}</h3>
      {description && <p className="text-sm text-text/50 mb-4">{description}</p>}
      {action}
    </div>
  );
}
