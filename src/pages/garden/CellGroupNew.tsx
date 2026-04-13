import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast } from "../../contexts/ToastContext";
import { useData } from "../../lib/useData";
import { PageHeader } from "../../components/PageHeader";

interface Season {
  id: number;
  name: string;
  year: number;
}

export function CellGroupNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { data: seasons } = useData<Season[]>("/garden/seasons");

  const [seasonId, setSeasonId] = useState(searchParams.get("season") || "");
  const [plantType, setPlantType] = useState("");
  const [variety, setVariety] = useState("");
  const [cellCount, setCellCount] = useState("1");
  const [seedCount, setSeedCount] = useState("");
  const [desiredYield, setDesiredYield] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plantType.trim() || !seasonId) return;

    setSubmitting(true);
    try {
      const result = await api.post<{ id: number }>(
        "/garden/cell-groups",
        {
          seasonId: parseInt(seasonId),
          plantType: plantType.trim(),
          variety: variety.trim() || undefined,
          cellCount: parseInt(cellCount) || 1,
          seedCount: seedCount ? parseInt(seedCount) : undefined,
          desiredYield: desiredYield ? parseInt(desiredYield) : undefined,
        }
      );

      addToast("Cell group created");
      navigate(`/garden/cell-groups/${result.id}`);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New Cell Group"
        backTo={seasonId ? `/garden/seasons/${seasonId}` : "/garden"}
      />
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Season *</label>
          <select
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            required
          >
            <option value="">Select season</option>
            {seasons?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Plant Type *</label>
          <input
            value={plantType}
            onChange={(e) => setPlantType(e.target.value)}
            placeholder="e.g. Tomato"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Variety</label>
          <input
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
            placeholder="e.g. Cherokee Purple"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cells</label>
            <input
              type="number"
              min="1"
              value={cellCount}
              onChange={(e) => setCellCount(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Seed Count</label>
            <input
              type="number"
              value={seedCount}
              onChange={(e) => setSeedCount(e.target.value)}
              placeholder="Approx."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Desired Yield</label>
            <input
              type="number"
              min="0"
              value={desiredYield}
              onChange={(e) => setDesiredYield(e.target.value)}
              placeholder="Target"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-white rounded-md px-6 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(
                seasonId ? `/garden/seasons/${seasonId}` : "/garden"
              )
            }
            className="border border-border rounded-md px-6 py-2 text-sm hover:bg-canvas"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
