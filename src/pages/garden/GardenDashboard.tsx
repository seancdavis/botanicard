import { Link } from "react-router-dom";
import { Leaf } from "@phosphor-icons/react";
import { useData } from "../../lib/useData";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { CardGridSkeleton } from "../../components/Skeleton";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";

interface Season {
  id: number;
  name: string;
  year: number;
  cellCount: number;
}

interface Cell {
  id: number;
  cardId: string;
  plantType: string;
  variety?: string;
  status: string;
  primaryPhotoBlobKey?: string | null;
}

export function GardenDashboard() {
  const { data: seasons, loading: seasonsLoading } =
    useData<Season[]>("/garden/seasons");

  const latestSeason = seasons?.[0];
  const { data: cells, loading: cellsLoading } = useData<Cell[]>(
    latestSeason ? `/garden/cells?season=${latestSeason.id}` : null
  );

  return (
    <div>
      <PageHeader
        title="Garden"
        actions={
          <Link
            to="/garden/seasons"
            className="border border-border rounded-md px-4 py-2 text-sm hover:bg-canvas"
          >
            All Seasons
          </Link>
        }
      />

      {seasonsLoading && <CardGridSkeleton count={3} />}

      {!seasonsLoading && !latestSeason && (
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

      {latestSeason && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{latestSeason.name}</h2>
            <div className="flex gap-2">
              <Link
                to={`/garden/cells/new?season=${latestSeason.id}`}
                className="bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                Add Cells
              </Link>
              <Link
                to="/garden/import"
                className="bg-accent text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                Import
              </Link>
            </div>
          </div>

          {cellsLoading && <CardGridSkeleton />}

          {cells && cells.length === 0 && (
            <EmptyState
              icon={<Leaf size={48} weight="light" />}
              title="No cells in this season yet"
              description="Add cells to start tracking plants in this season."
              action={
                <Link
                  to={`/garden/cells/new?season=${latestSeason.id}`}
                  className="inline-block bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
                >
                  Add Cells
                </Link>
              }
            />
          )}

          {cells && cells.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cells.map((cell) => (
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
      )}
    </div>
  );
}
