import { useNavigate, Link } from "react-router-dom";
import { Plus, Leaf } from "@phosphor-icons/react";
import { useData } from "../../lib/useData";
import { Card } from "../../components/Card";
import { CardGridSkeleton } from "../../components/Skeleton";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";

interface Season {
  id: number;
  name: string;
  year: number;
  description?: string;
  cellCount: number;
}

export function SeasonList() {
  const { data: seasons, loading } = useData<Season[]>("/garden/seasons");
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Seasons"
        backTo="/garden"
        actions={
          <Link
            to="/garden/seasons/new"
            className="bg-accent text-white rounded-full w-10 h-10 flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Plus size={20} weight="bold" />
          </Link>
        }
      />

      {loading && <CardGridSkeleton count={4} />}

      {seasons && seasons.length === 0 && (
        <EmptyState
          icon={<Leaf size={48} weight="light" />}
          title="No seasons yet"
          description="Create your first season to start tracking your garden."
          action={
            <Link
              to="/garden/seasons/new"
              className="inline-block bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Create Season
            </Link>
          }
        />
      )}

      {seasons && seasons.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {seasons.map((season) => (
            <Card
              key={season.id}
              onClick={() => navigate(`/garden/seasons/${season.id}`)}
              className="p-5"
            >
              <h3 className="text-lg font-heading font-semibold">
                {season.name}
              </h3>
              <p className="text-sm text-text/50 mt-1">
                {season.cellCount} cell{season.cellCount !== 1 ? "s" : ""}
              </p>
              {season.description && (
                <p className="text-sm text-text/60 mt-2 line-clamp-2">
                  {season.description}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
