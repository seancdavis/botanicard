import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { HouseplantList } from "./pages/houseplants/HouseplantList";
import { HouseplantNew } from "./pages/houseplants/HouseplantNew";
import { HouseplantDetail } from "./pages/houseplants/HouseplantDetail";
import { HouseplantEdit } from "./pages/houseplants/HouseplantEdit";
import { PlanterList } from "./pages/planters/PlanterList";
import { PlanterNew } from "./pages/planters/PlanterNew";
import { PlanterDetail } from "./pages/planters/PlanterDetail";
import { PlanterEdit } from "./pages/planters/PlanterEdit";
import { GardenDashboard } from "./pages/garden/GardenDashboard";
import { SeasonList } from "./pages/garden/SeasonList";
import { SeasonNew } from "./pages/garden/SeasonNew";
import { SeasonDetail } from "./pages/garden/SeasonDetail";
import { CellGroupNew } from "./pages/garden/CellGroupNew";
import { CellGroupDetail } from "./pages/garden/CellGroupDetail";
import { CellGroupEdit } from "./pages/garden/CellGroupEdit";
import { GardenImport } from "./pages/garden/GardenImport";
import { BlobCleanup } from "./pages/admin/BlobCleanup";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />

        <Route path="/houseplants" element={<HouseplantList />} />
        <Route path="/houseplants/new" element={<HouseplantNew />} />
        <Route path="/houseplants/:id" element={<HouseplantDetail />} />
        <Route path="/houseplants/:id/edit" element={<HouseplantEdit />} />

        <Route path="/planters" element={<PlanterList />} />
        <Route path="/planters/new" element={<PlanterNew />} />
        <Route path="/planters/:id" element={<PlanterDetail />} />
        <Route path="/planters/:id/edit" element={<PlanterEdit />} />

        <Route path="/garden" element={<GardenDashboard />} />
        <Route path="/garden/seasons" element={<SeasonList />} />
        <Route path="/garden/seasons/new" element={<SeasonNew />} />
        <Route path="/garden/seasons/:id" element={<SeasonDetail />} />
        <Route path="/garden/cell-groups/new" element={<CellGroupNew />} />
        <Route path="/garden/cell-groups/:id" element={<CellGroupDetail />} />
        <Route path="/garden/cell-groups/:id/edit" element={<CellGroupEdit />} />
        <Route path="/garden/import" element={<GardenImport />} />

        <Route path="/admin/blob-cleanup" element={<BlobCleanup />} />
      </Route>
    </Routes>
  );
}
