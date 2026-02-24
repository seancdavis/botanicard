import { Link } from "react-router-dom";
import { Plant, PottedPlant, Leaf, Upload } from "@phosphor-icons/react";
import { useData } from "../lib/useData";
import { Card } from "../components/Card";
import { CardGridSkeleton } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";

interface Houseplant {
  id: number;
  status: string;
}

interface Planter {
  id: number;
  status: string;
}

interface Season {
  id: number;
  name: string;
  cellCount: number;
}


export function Dashboard() {
  const { data: plants, loading: plantsLoading } =
    useData<Houseplant[]>("/houseplants");
  const { data: planters, loading: plantersLoading } =
    useData<Planter[]>("/planters");
  const { data: seasons, loading: seasonsLoading } =
    useData<Season[]>("/garden/seasons");

  const activePlants = plants?.filter((p) => p.status === "active").length || 0;
  const activePlanters =
    planters?.filter((p) => p.status === "active").length || 0;
  const latestSeason = seasons?.[0];
  const loading = plantsLoading || plantersLoading || seasonsLoading;

  return (
    <div>
      <PageHeader title="Dashboard" />

      {loading && <CardGridSkeleton count={3} />}

      {!loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Link to="/houseplants">
              <Card className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plant size={20} weight="light" className="text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading">
                      {activePlants}
                    </p>
                    <p className="text-xs text-text/50">Active Houseplants</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/planters">
              <Card className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <PottedPlant
                      size={20}
                      weight="light"
                      className="text-primary"
                    />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading">
                      {activePlanters}
                    </p>
                    <p className="text-xs text-text/50">Active Planters</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/garden">
              <Card className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Leaf
                      size={20}
                      weight="light"
                      className="text-primary"
                    />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading">
                      {latestSeason?.cellCount || 0}
                    </p>
                    <p className="text-xs text-text/50">
                      {latestSeason
                        ? `${latestSeason.name} Cells`
                        : "Garden Cells"}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          {/* Quick Actions */}
          <h2 className="text-xl font-bold mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/houseplants/new"
              className="bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 flex items-center gap-2"
            >
              <Plant size={16} weight="light" />
              Add Houseplant
            </Link>
            <Link
              to="/planters/new"
              className="bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 flex items-center gap-2"
            >
              <PottedPlant size={16} weight="light" />
              Add Planter
            </Link>
            <Link
              to="/garden/import"
              className="bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 flex items-center gap-2"
            >
              <Upload size={16} weight="light" />
              Garden Import Log
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
