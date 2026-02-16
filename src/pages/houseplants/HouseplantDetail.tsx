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

interface Photo {
  id: number;
  blobKey: string;
  filename?: string;
  caption?: string;
}

interface Note {
  id: number;
  content?: string;
  createdAt: string;
  photos?: Photo[];
}

interface HouseplantDetail {
  id: number;
  cardId: string;
  name: string;
  description?: string;
  status: string;
  parentId?: number;
  planterId?: number;
  createdAt: string;
  parent?: { id: number; cardId: string; name: string } | null;
  children?: { id: number; cardId: string; name: string; status: string }[];
  planter?: { id: number; cardId: string; name: string } | null;
  primaryPhoto?: Photo | null;
  notes: Note[];
}

export function HouseplantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: plant, loading, refetch } = useData<HouseplantDetail>(
    `/houseplants/${id}`
  );

  const handleDelete = async () => {
    if (!confirm("Delete this houseplant?")) return;
    try {
      await api.delete(`/houseplants/${id}`);
      addToast("Houseplant deleted");
      navigate("/houseplants");
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

  if (!plant) {
    return <div className="text-text/50">Houseplant not found.</div>;
  }

  return (
    <div>
      <PageHeader
        title={plant.name}
        backTo="/houseplants"
        actions={
          <div className="flex gap-2">
            <Link
              to={`/houseplants/${id}/edit`}
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

      {plant.primaryPhoto && (
        <img
          src={`/api/photos/${plant.primaryPhoto.blobKey}`}
          alt={plant.name}
          className="w-full h-64 object-cover rounded-xl mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-mono text-text/40">#{plant.cardId}</span>
              <StatusBadge status={plant.status} />
            </div>
            {plant.description && (
              <p className="text-sm text-text/70 whitespace-pre-wrap">
                {plant.description}
              </p>
            )}
            <p className="text-xs text-text/40 mt-3">
              Added{" "}
              {new Date(plant.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </Card>

          <div>
            <h2 className="text-xl font-bold mb-3">Notes</h2>
            <AddNoteForm
              entityType="houseplant"
              entityId={plant.id}
              onNoteAdded={refetch}
            />
            <div className="mt-4">
              <NotesList notes={plant.notes} onDelete={handleDeleteNote} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {plant.parent && (
            <Card className="p-4">
              <h3 className="text-xs font-medium text-text/50 uppercase mb-2">
                Parent
              </h3>
              <Link
                to={`/houseplants/${plant.parent.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                #{plant.parent.cardId} — {plant.parent.name}
              </Link>
            </Card>
          )}

          {plant.children && plant.children.length > 0 && (
            <Card className="p-4">
              <h3 className="text-xs font-medium text-text/50 uppercase mb-2">
                Children ({plant.children.length})
              </h3>
              <div className="space-y-1">
                {plant.children.map((child) => (
                  <div key={child.id} className="flex items-center justify-between">
                    <Link
                      to={`/houseplants/${child.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      #{child.cardId} — {child.name}
                    </Link>
                    <StatusBadge status={child.status} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {plant.planter && (
            <Card className="p-4">
              <h3 className="text-xs font-medium text-text/50 uppercase mb-2">
                Planter
              </h3>
              <Link
                to={`/planters/${plant.planter.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {plant.planter.cardId} — {plant.planter.name}
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
