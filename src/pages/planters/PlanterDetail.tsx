import { useParams, Link, useNavigate } from "react-router-dom";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useData } from "../../lib/useData";
import { useToast } from "../../contexts/ToastContext";
import { api } from "../../lib/api";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { NotesList } from "../../components/NotesList";
import { AddNoteForm } from "../../components/AddNoteForm";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";

interface Note {
  id: number;
  content?: string;
  observedAt?: string | null;
  createdAt: string;
  photos?: { id: number; blobKey: string; filename?: string; caption?: string }[];
}

interface PlanterDetailData {
  id: number;
  cardId: string;
  name: string;
  description?: string;
  photoBlobKey?: string | null;
  status: string;
  createdAt: string;
  currentPlants?: { id: number; cardId: string; name: string; status: string }[];
  notes: Note[];
}

export function PlanterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: planter, loading, refetch } = useData<PlanterDetailData>(
    `/planters/${id}`
  );

  const handleDelete = async () => {
    if (!confirm("Delete this planter?")) return;
    try {
      await api.delete(`/planters/${id}`);
      addToast("Planter deleted");
      navigate("/planters");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete", "error");
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      await api.delete(`/notes/${noteId}`);
      addToast("Note deleted");
      refetch();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete note", "error");
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-32 w-full mb-4" />
      </div>
    );
  }

  if (!planter) {
    return <div className="text-text/50">Planter not found.</div>;
  }

  return (
    <div>
      <PageHeader
        title={planter.name}
        backTo="/planters"
        actions={
          <div className="flex gap-2">
            <Link
              to={`/planters/${id}/edit`}
              className="text-text/40 hover:text-text transition-colors"
            >
              <PencilSimple size={20} weight="light" />
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

      {planter.photoBlobKey && (
        <img
          src={`/api/photos/${planter.photoBlobKey}`}
          alt={planter.name}
          className="w-full h-64 object-cover rounded-xl mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-mono text-text/40">{planter.cardId}</span>
              <StatusBadge status={planter.status} />
            </div>
            {planter.description && (
              <p className="text-sm text-text/70 whitespace-pre-wrap">
                {planter.description}
              </p>
            )}
            <p className="text-xs text-text/40 mt-3">
              Added{" "}
              {new Date(planter.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </Card>

          <div>
            <h2 className="text-xl font-bold mb-3">Notes</h2>
            <AddNoteForm
              entityType="planter"
              entityId={planter.id}
              onNoteAdded={refetch}
            />
            <div className="mt-4">
              <NotesList notes={planter.notes} onDelete={handleDeleteNote} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {planter.currentPlants && planter.currentPlants.length > 0 && (
            <Card className="p-4">
              <h3 className="text-xs font-medium text-text/50 uppercase mb-2">
                Current Plants
              </h3>
              <div className="space-y-1">
                {planter.currentPlants.map((plant) => (
                  <div key={plant.id} className="flex items-center justify-between">
                    <Link
                      to={`/houseplants/${plant.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      #{plant.cardId} — {plant.name}
                    </Link>
                    <StatusBadge status={plant.status} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
