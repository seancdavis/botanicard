import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useData } from "../../lib/useData";
import { useToast } from "../../contexts/ToastContext";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";

interface Cell {
  id: number;
  cardId: string;
  plantType: string;
  variety?: string;
  seedCount?: number;
  status: string;
  description?: string;
  seasonId: number;
}

export function CellEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: cell, loading } = useData<Cell>(`/garden/cells/${id}`);

  const [plantType, setPlantType] = useState("");
  const [variety, setVariety] = useState("");
  const [seedCount, setSeedCount] = useState("");
  const [status, setStatus] = useState("seeded");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cell) {
      setPlantType(cell.plantType);
      setVariety(cell.variety || "");
      setSeedCount(cell.seedCount ? String(cell.seedCount) : "");
      setStatus(cell.status);
      setDescription(cell.description || "");
    }
  }, [cell]);

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  if (!cell) {
    return <div className="text-text/50">Cell not found.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plantType.trim()) return;

    setSubmitting(true);
    try {
      await api.put(`/garden/cells/${id}`, {
        plantType: plantType.trim(),
        variety: variety.trim() || undefined,
        seedCount: seedCount ? parseInt(seedCount) : undefined,
        status,
        description: description.trim() || undefined,
      });
      addToast("Cell updated");
      navigate(`/garden/cells/${id}`);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to update", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title={`Edit ${cell.cardId}`} backTo={`/garden/cells/${id}`} />
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Plant Type *</label>
          <input
            value={plantType}
            onChange={(e) => setPlantType(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Variety</label>
          <input
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Seed Count</label>
          <input
            type="number"
            value={seedCount}
            onChange={(e) => setSeedCount(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="seeded">Seeded</option>
            <option value="sprouting">Sprouting</option>
            <option value="growing">Growing</option>
            <option value="transplanted">Transplanted</option>
            <option value="producing">Producing</option>
            <option value="harvested">Harvested</option>
            <option value="dead">Dead</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-white rounded-md px-6 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/garden/cells/${id}`)}
            className="border border-border rounded-md px-6 py-2 text-sm hover:bg-canvas"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
