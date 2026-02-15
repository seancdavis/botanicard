import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useData } from "../../lib/useData";
import { useToast } from "../../contexts/ToastContext";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";

interface Houseplant {
  id: number;
  cardId: string;
  name: string;
  description?: string;
  parentId?: number;
  planterId?: number;
  status: string;
}

interface Planter {
  id: number;
  cardId: string;
  name: string;
}

export function HouseplantEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: plant, loading } = useData<Houseplant>(`/houseplants/${id}`);
  const { data: allPlants } = useData<Houseplant[]>("/houseplants");
  const { data: allPlanters } = useData<Planter[]>("/planters");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [planterId, setPlanterId] = useState("");
  const [status, setStatus] = useState("active");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (plant) {
      setName(plant.name);
      setDescription(plant.description || "");
      setParentId(plant.parentId ? String(plant.parentId) : "");
      setPlanterId(plant.planterId ? String(plant.planterId) : "");
      setStatus(plant.status);
    }
  }, [plant]);

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  if (!plant) {
    return <div className="text-text/50">Houseplant not found.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await api.put(`/houseplants/${id}`, {
        name: name.trim(),
        description: description.trim() || undefined,
        parentId: parentId ? parseInt(parentId) : undefined,
        planterId: planterId ? parseInt(planterId) : undefined,
        status,
      });
      addToast("Houseplant updated");
      navigate(`/houseplants/${id}`);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to update", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter out this plant from parent options
  const parentOptions = allPlants?.filter((p) => p.id !== plant.id) || [];

  return (
    <div>
      <PageHeader title={`Edit ${plant.name}`} backTo={`/houseplants/${id}`} />
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            required
          />
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
        <div>
          <label className="block text-sm font-medium mb-1">Parent Plant</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">None</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.cardId} — {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Planter</label>
          <select
            value={planterId}
            onChange={(e) => setPlanterId(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">None</option>
            {allPlanters?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.cardId} — {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="dead">Dead</option>
            <option value="given_away">Given Away</option>
            <option value="sold">Sold</option>
          </select>
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
            onClick={() => navigate(`/houseplants/${id}`)}
            className="border border-border rounded-md px-6 py-2 text-sm hover:bg-canvas"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
