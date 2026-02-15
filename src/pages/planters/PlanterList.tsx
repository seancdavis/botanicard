import { useNavigate, Link } from "react-router-dom";
import { Plus, PottedPlant } from "@phosphor-icons/react";
import { useData } from "../../lib/useData";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { CardGridSkeleton } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";

interface Planter {
  id: number;
  cardId: string;
  name: string;
  description?: string;
  status: string;
}

export function PlanterList() {
  const { data: planterList, loading } = useData<Planter[]>("/planters");
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Planters"
        actions={
          <Link
            to="/planters/new"
            className="bg-accent text-white rounded-full w-10 h-10 flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Plus size={20} weight="bold" />
          </Link>
        }
      />

      {loading && <CardGridSkeleton />}

      {!loading && planterList && planterList.length === 0 && (
        <EmptyState
          icon={<PottedPlant size={48} weight="light" />}
          title="No planters yet"
          description="Add your first planter to get started."
          action={
            <Link
              to="/planters/new"
              className="inline-block bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Add Planter
            </Link>
          }
        />
      )}

      {planterList && planterList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {planterList.map((planter) => (
            <Card
              key={planter.id}
              onClick={() => navigate(`/planters/${planter.id}`)}
              className="p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-text/40">
                  {planter.cardId}
                </span>
                <StatusBadge status={planter.status} />
              </div>
              <h3 className="text-lg font-heading font-semibold">
                {planter.name}
              </h3>
              {planter.description && (
                <p className="text-sm text-text/60 mt-1 line-clamp-2">
                  {planter.description}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
