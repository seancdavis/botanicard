import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";

interface PageHeaderProps {
  title: string;
  backTo?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, backTo, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="text-text/40 hover:text-text transition-colors"
          >
            <ArrowLeft size={20} weight="light" />
          </button>
        )}
        <h1 className="text-3xl font-bold">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
