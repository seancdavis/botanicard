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

interface CellDetailData {
  id: number;
  cardId: string;
  seasonId: number;
  plantType: string;
  variety?: string;
  seedCount?: number;
  status: string;
  description?: string;
  createdAt: string;
  season?: { id: number; name: string; year: number };
  primaryPhoto?: Photo | null;
  notes: Note[];
}

const statusOrder = [
  "seeded",
  "sprouting",
  "growing",
  "transplanted",
  "producing",
  "harvested",
  "dead",
];

export function CellDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: cell, loading, refetch } = useData<CellDetailData>(
    `/garden/cells/${id}`
  );

  const handleDelete = async () => {
    if (!confirm("Delete this cell?")) return;
    try {
      await api.delete(`/garden/cells/${id}`);
      addToast("Cell deleted");
      navigate(cell?.seasonId ? `/garden/seasons/${cell.seasonId}` : "/garden");
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

  if (!cell) {
    return <div className="text-text/50">Cell not found.</div>;
  }

  const currentStatusIndex = statusOrder.indexOf(cell.status);

  return (
    <div>
      <PageHeader
        title={cell.plantType}
        backTo={
          cell.season
            ? `/garden/seasons/${cell.seasonId}`
            : "/garden"
        }
        actions={
          <div className="flex gap-2">
            <Link
              to={`/garden/cells/${id}/edit`}
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

      {cell.primaryPhoto && (
        <img
          src={`/api/photos/${cell.primaryPhoto.blobKey}`}
          alt={cell.plantType}
          className="w-full h-64 object-cover rounded-xl mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-mono text-text/40">{cell.cardId}</span>
              <StatusBadge status={cell.status} />
            </div>
            {cell.variety && (
              <p className="text-sm text-text/70 mb-2">
                Variety: {cell.variety}
              </p>
            )}
            {cell.seedCount && (
              <p className="text-sm text-text/70 mb-2">
                Seeds: ~{cell.seedCount}
              </p>
            )}
            {cell.description && (
              <p className="text-sm text-text/70 whitespace-pre-wrap">
                {cell.description}
              </p>
            )}
          </Card>

          {/* Status Timeline */}
          <Card className="p-5">
            <h3 className="text-sm font-medium text-text/50 uppercase mb-3">
              Lifecycle
            </h3>
            <div className="flex items-center gap-1">
              {statusOrder.map((status, i) => {
                const isPast = i <= currentStatusIndex;
                const isCurrent = i === currentStatusIndex;
                return (
                  <div key={status} className="flex-1">
                    <div
                      className={`h-2 rounded-full ${
                        isPast ? "bg-primary" : "bg-border"
                      } ${isCurrent ? "ring-2 ring-primary/30" : ""}`}
                    />
                    <p
                      className={`text-[10px] mt-1 text-center capitalize ${
                        isCurrent ? "text-primary font-medium" : "text-text/30"
                      }`}
                    >
                      {status}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          <div>
            <h2 className="text-xl font-bold mb-3">Notes</h2>
            <AddNoteForm
              entityType="garden_cell"
              entityId={cell.id}
              onNoteAdded={refetch}
            />
            <div className="mt-4">
              <NotesList notes={cell.notes} onDelete={handleDeleteNote} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {cell.season && (
            <Card className="p-4">
              <h3 className="text-xs font-medium text-text/50 uppercase mb-2">
                Season
              </h3>
              <Link
                to={`/garden/seasons/${cell.season.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {cell.season.name}
              </Link>
            </Card>
          )}

          <Card className="p-4">
            <h3 className="text-xs font-medium text-text/50 uppercase mb-2">
              Added
            </h3>
            <p className="text-sm">
              {new Date(cell.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
