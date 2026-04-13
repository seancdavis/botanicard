import { useParams, Link } from "react-router-dom";
import { Leaf, Plus } from "@phosphor-icons/react";
import { useData } from "../../lib/useData";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { CardGridSkeleton } from "../../components/Skeleton";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";

interface CellGroup {
  id: number;
  cardId: string;
  plantType: string;
  variety?: string;
  cellCount: number;
  status: string;
  primaryPhotoBlobKey?: string | null;
}

interface SeasonDetailData {
  id: number;
  name: string;
  year: number;
  description?: string;
  groups: CellGroup[];
}

export function SeasonDetail() {
  const { id } = useParams();
  const { data: season, loading } = useData<SeasonDetailData>(
    `/garden/seasons/${id}`
  );

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
              to="/garden/seasons"
              className="border border-border rounded-md px-4 py-2 text-sm hover:bg-canvas"
            >
              All Seasons
            </Link>
            <Link
              to={`/garden/cell-groups/new?season=${season.id}`}
              className="bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 flex items-center gap-2"
            >
              <Plus size={16} weight="light" />
              Add Cell Group
            </Link>
          </div>
        }
      />

      {season.description && (
        <p className="text-sm text-text/60 mb-6 -mt-4">{season.description}</p>
      )}

      {season.groups.length === 0 ? (
        <EmptyState
          icon={<Leaf size={48} weight="light" />}
          title="No cell groups yet"
          description="Add cell groups to start tracking plants in this season."
          action={
            <Link
              to={`/garden/cell-groups/new?season=${season.id}`}
              className="inline-block bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Add Cell Group
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {season.groups.map((group) => (
            <Link key={group.id} to={`/garden/cell-groups/${group.id}`}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                {group.primaryPhotoBlobKey && (
                  <img
                    src={`/api/photos/${group.primaryPhotoBlobKey}`}
                    alt={group.plantType}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-text/40">
                      {group.cardId}
                    </span>
                    <StatusBadge status={group.status} />
                  </div>
                  <h3 className="text-lg font-heading font-semibold">
                    {group.plantType}
                  </h3>
                  {group.variety && (
                    <p className="text-sm text-text/60 mt-1">{group.variety}</p>
                  )}
                  {group.cellCount > 1 && (
                    <p className="text-xs text-text/40 mt-1">
                      {group.cellCount} cells
                    </p>
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
