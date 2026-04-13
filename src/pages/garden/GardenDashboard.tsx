import { Navigate, Link } from "react-router-dom";
import { Leaf, WarningCircle } from "@phosphor-icons/react";
import { useData } from "../../lib/useData";
import { CardGridSkeleton } from "../../components/Skeleton";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";

interface Season {
  id: number;
  name: string;
  year: number;
  groupCount: number;
}

export function GardenDashboard() {
  const { data: seasons, loading, error } =
    useData<Season[]>("/garden/seasons");

  const latestSeason = seasons?.[0];

  if (loading) {
    return (
      <div>
        <PageHeader title="Garden" />
        <CardGridSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Garden" />
        <EmptyState
          icon={<WarningCircle size={48} weight="light" />}
          title="Failed to load garden"
          description={error}
        />
      </div>
    );
  }

  if (!latestSeason) {
    return (
      <div>
        <PageHeader title="Garden" />
        <EmptyState
          icon={<Leaf size={48} weight="light" />}
          title="No seasons yet"
          description="Create your first season to start tracking your garden."
          action={
            <Link
              to="/garden/seasons/new"
              className="inline-block bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              New Season
            </Link>
          }
        />
      </div>
    );
  }

  return <Navigate to={`/garden/seasons/${latestSeason.id}`} replace />;
}
