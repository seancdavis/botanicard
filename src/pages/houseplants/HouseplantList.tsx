import { useNavigate, Link } from "react-router-dom";
import { Plus, Plant, WarningCircle } from "@phosphor-icons/react";
import { useData } from "../../lib/useData";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { CardGridSkeleton } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";

interface Houseplant {
  id: number;
  cardId: string;
  name: string;
  description?: string;
  status: string;
  primaryPhotoBlobKey?: string | null;
}

export function HouseplantList() {
  const { data: plants, loading, error } = useData<Houseplant[]>("/houseplants");
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Houseplants"
        actions={
          <Link
            to="/houseplants/new"
            className="bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 flex items-center gap-2"
          >
            <Plus size={16} weight="light" />
            New Houseplant
          </Link>
        }
      />

      {loading && <CardGridSkeleton />}

      {error && (
        <EmptyState
          icon={<WarningCircle size={48} weight="light" />}
          title="Failed to load houseplants"
          description={error}
        />
      )}

      {!loading && plants && plants.length === 0 && (
        <EmptyState
          icon={<Plant size={48} weight="light" />}
          title="No houseplants yet"
          description="Add your first houseplant to get started."
          action={
            <Link
              to="/houseplants/new"
              className="inline-block bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Add Houseplant
            </Link>
          }
        />
      )}

      {plants && plants.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plants.map((plant) => (
            <Card
              key={plant.id}
              onClick={() => navigate(`/houseplants/${plant.id}`)}
              className="overflow-hidden"
            >
              {plant.primaryPhotoBlobKey && (
                <img
                  src={`/api/photos/${plant.primaryPhotoBlobKey}`}
                  alt={plant.name}
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-text/40">
                    #{plant.cardId}
                  </span>
                  <StatusBadge status={plant.status} />
                </div>
                <h3 className="text-lg font-heading font-semibold">
                  {plant.name}
                </h3>
                {plant.description && (
                  <p className="text-sm text-text/60 mt-1 line-clamp-2">
                    {plant.description}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
