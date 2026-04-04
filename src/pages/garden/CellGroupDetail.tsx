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
  observedAt?: string | null;
  createdAt: string;
  photos?: Photo[];
}

interface CellGroupDetailData {
  id: number;
  cardId: string;
  seasonId: number;
  plantType: string;
  variety?: string;
  cellCount: number;
  seedCount?: number;
  desiredYield?: number;
  actualYield?: number;
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

export function CellGroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: group, loading, refetch } = useData<CellGroupDetailData>(
    `/garden/cell-groups/${id}`
  );

  const handleDelete = async () => {
    if (!confirm("Delete this cell group?")) return;
    try {
      await api.delete(`/garden/cell-groups/${id}`);
      addToast("Cell group deleted");
      navigate(group?.seasonId ? `/garden/seasons/${group.seasonId}` : "/garden");
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

  if (!group) {
    return <div className="text-text/50">Cell group not found.</div>;
  }

  const currentStatusIndex = statusOrder.indexOf(group.status);

  return (
    <div>
      <PageHeader
        title={group.plantType}
        backTo={
          group.season
            ? `/garden/seasons/${group.seasonId}`
            : "/garden"
        }
        actions={
          <div className="flex gap-2">
            <Link
              to={`/garden/cell-groups/${id}/edit`}
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

      {group.primaryPhoto && (
        <img
          src={`/api/photos/${group.primaryPhoto.blobKey}`}
          alt={group.plantType}
          className="w-full h-64 object-cover rounded-xl mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-mono text-text/40">{group.cardId}</span>
              <StatusBadge status={group.status} />
            </div>
            {group.variety && (
              <p className="text-sm text-text/70 mb-2">
                Variety: {group.variety}
              </p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <p className="text-sm text-text/70">
                Cells: {group.cellCount}
              </p>
              {group.seedCount && (
                <p className="text-sm text-text/70">
                  Seeds: ~{group.seedCount}
                </p>
              )}
              {group.desiredYield && (
                <p className="text-sm text-text/70">
                  Desired yield: {group.desiredYield}
                </p>
              )}
              {group.actualYield != null && (
                <p className="text-sm text-text/70">
                  Actual yield: {group.actualYield}
                </p>
              )}
            </div>
            {group.description && (
              <p className="text-sm text-text/70 whitespace-pre-wrap mt-2">
                {group.description}
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
              entityType="garden_cell_group"
              entityId={group.id}
              onNoteAdded={refetch}
            />
            <div className="mt-4">
              <NotesList notes={group.notes} onDelete={handleDeleteNote} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {group.season && (
            <Card className="p-4">
              <h3 className="text-xs font-medium text-text/50 uppercase mb-2">
                Season
              </h3>
              <Link
                to={`/garden/seasons/${group.season.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {group.season.name}
              </Link>
            </Card>
          )}

          <Card className="p-4">
            <h3 className="text-xs font-medium text-text/50 uppercase mb-2">
              Added
            </h3>
            <p className="text-sm">
              {new Date(group.createdAt).toLocaleDateString("en-US", {
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
