import { useParams, Link, useNavigate } from "react-router-dom";
import { Trash, Leaf } from "@phosphor-icons/react";
import { useData } from "../../lib/useData";
import { useToast } from "../../contexts/ToastContext";
import { api } from "../../lib/api";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { CardGridSkeleton } from "../../components/Skeleton";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";

interface Cell {
  id: number;
  cardId: string;
  plantType: string;
  variety?: string;
  status: string;
  primaryPhotoBlobKey?: string | null;
}

interface SeasonDetailData {
  id: number;
  name: string;
  year: number;
  description?: string;
  cells: Cell[];
}

export function SeasonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: season, loading } = useData<SeasonDetailData>(
    `/garden/seasons/${id}`
  );

  const handleDelete = async () => {
    if (!confirm("Delete this season and all its cells?")) return;
    try {
      await api.delete(`/garden/seasons/${id}`);
      addToast("Season deleted");
      navigate("/garden/seasons");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete", "error");
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <CardGridSkeleton />
      </div>
    );
  }

  if (!season) {
    return <div className="text-text/50">Season not found.</div>;
  }

  return (
    <div>
      <PageHeader
        title={season.name}
        backTo="/garden/seasons"
        actions={
          <div className="flex gap-2">
            <Link
              to={`/garden/cells/new?season=${season.id}`}
              className="bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Add Cells
            </Link>
            <button
              onClick={handleDelete}
              className="text-text/40 hover:text-red-500 transition-colors"
            >
              <Trash size={20} weight="light" />
            </button>
          </div>
        }
      />

      {season.description && (
        <p className="text-sm text-text/60 mb-6 -mt-4">{season.description}</p>
      )}

      {season.cells.length === 0 ? (
        <EmptyState
          icon={<Leaf size={48} weight="light" />}
          title="No cells yet"
          description="Add cells to start tracking plants in this season."
          action={
            <Link
              to={`/garden/cells/new?season=${season.id}`}
              className="inline-block bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Add Cells
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {season.cells.map((cell) => (
            <Link key={cell.id} to={`/garden/cells/${cell.id}`}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                {cell.primaryPhotoBlobKey && (
                  <img
                    src={`/api/photos/${cell.primaryPhotoBlobKey}`}
                    alt={cell.plantType}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-text/40">
                      {cell.cardId}
                    </span>
                    <StatusBadge status={cell.status} />
                  </div>
                  <h3 className="text-lg font-heading font-semibold">
                    {cell.plantType}
                  </h3>
                  {cell.variety && (
                    <p className="text-sm text-text/60 mt-1">{cell.variety}</p>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
