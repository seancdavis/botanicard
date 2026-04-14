import { useState, useRef } from "react";
import { Notepad, PencilSimple, Trash, Camera, X } from "@phosphor-icons/react";
import { EmptyState } from "./EmptyState";
import { ConfirmDialog } from "./ConfirmDialog";
import { api } from "../lib/api";
import { useToast } from "../contexts/ToastContext";

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

interface NotesListProps {
  notes: Note[];
  onDelete?: (id: number) => void;
  onNoteUpdated?: () => void;
}

interface EditState {
  content: string;
  observedAt: string;
  removePhotoIds: number[];
  newFiles: File[];
}

export function NotesList({ notes, onDelete, onNoteUpdated }: NotesListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  if (notes.length === 0) {
    return (
      <EmptyState
        icon={<Notepad size={48} weight="light" />}
        title="No notes yet"
        description="Add a note to track changes."
      />
    );
  }

  function startEditing(note: Note) {
    const dateStr = note.observedAt || note.createdAt;
    setEditingId(note.id);
    setEditState({
      content: note.content || "",
      observedAt: dateStr ? new Date(dateStr).toISOString().slice(0, 10) : "",
      removePhotoIds: [],
      newFiles: [],
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditState(null);
  }

  function toggleRemovePhoto(photoId: number) {
    if (!editState) return;
    setEditState((prev) => {
      if (!prev) return prev;
      const ids = prev.removePhotoIds.includes(photoId)
        ? prev.removePhotoIds.filter((id) => id !== photoId)
        : [...prev.removePhotoIds, photoId];
      return { ...prev, removePhotoIds: ids };
    });
  }

  async function saveEdit(noteId: number) {
    if (!editState) return;
    setSaving(true);
    try {
      // Upload new photos first
      const photoKeys: string[] = [];
      for (const file of editState.newFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Photo upload failed");
        const data = await res.json();
        photoKeys.push(data.key);
      }

      await api.put(`/notes/${noteId}`, {
        content: editState.content.trim() || null,
        observedAt: editState.observedAt
          ? new Date(editState.observedAt + "T12:00:00").toISOString()
          : null,
        removePhotoIds: editState.removePhotoIds,
        photoKeys,
      });

      cancelEditing();
      addToast("Note updated");
      onNoteUpdated?.();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to update note",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => {
        const isEditing = editingId === note.id;

        return (
          <div
            key={note.id}
            className="bg-surface rounded-lg border border-border p-4"
          >
            {isEditing && editState ? (
              <div className="space-y-3">
                <textarea
                  value={editState.content}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev ? { ...prev, content: e.target.value } : prev
                    )
                  }
                  rows={3}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />

                <div className="flex items-center gap-2">
                  <label className="text-xs text-text/50">
                    Observation date
                  </label>
                  <input
                    type="date"
                    value={editState.observedAt}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev
                          ? { ...prev, observedAt: e.target.value }
                          : prev
                      )
                    }
                    className="border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Existing photos with remove toggle */}
                {note.photos && note.photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {note.photos.map((photo) => {
                      const isMarkedForRemoval =
                        editState.removePhotoIds.includes(photo.id);
                      return (
                        <div key={photo.id} className="relative">
                          <img
                            src={`/api/photos/${photo.blobKey}`}
                            alt={photo.caption || photo.filename || "Photo"}
                            className={`w-24 h-24 object-cover rounded-lg border border-border transition-opacity ${
                              isMarkedForRemoval ? "opacity-30" : ""
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => toggleRemovePhoto(photo.id)}
                            className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer text-white text-xs ${
                              isMarkedForRemoval
                                ? "bg-text/40 hover:bg-text/60"
                                : "bg-red-500 hover:bg-red-600"
                            }`}
                            title={
                              isMarkedForRemoval
                                ? "Keep photo"
                                : "Remove photo"
                            }
                          >
                            <X size={12} weight="bold" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* New files preview */}
                {editState.newFiles.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {editState.newFiles.map((file, i) => (
                      <div key={i} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-24 h-24 object-cover rounded-lg border border-primary/30"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditState((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    newFiles: prev.newFiles.filter(
                                      (_, j) => j !== i
                                    ),
                                  }
                                : prev
                            )
                          }
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center cursor-pointer text-white text-xs"
                        >
                          <X size={12} weight="bold" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-text/40 hover:text-text/70 transition-colors cursor-pointer"
                    >
                      <Camera size={20} weight="light" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const selected = Array.from(e.target.files || []);
                        setEditState((prev) =>
                          prev
                            ? {
                                ...prev,
                                newFiles: [...prev.newFiles, ...selected],
                              }
                            : prev
                        );
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-3 py-1.5 text-sm text-text/60 hover:text-text cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(note.id)}
                      disabled={saving}
                      className="bg-primary text-white rounded-md px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {note.content && (
                      <p className="text-sm whitespace-pre-wrap">
                        {note.content}
                      </p>
                    )}
                    {note.photos && note.photos.length > 0 && (
                      <div
                        className={`flex gap-2 flex-wrap${note.content ? " mt-2" : ""}`}
                      >
                        {note.photos.map((photo) => (
                          <img
                            key={photo.id}
                            src={`/api/photos/${photo.blobKey}`}
                            alt={
                              photo.caption || photo.filename || "Photo"
                            }
                            className="w-24 h-24 object-cover rounded-lg border border-border"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {onNoteUpdated && (
                      <button
                        onClick={() => startEditing(note)}
                        className="text-text/30 hover:text-primary text-xs cursor-pointer flex items-center gap-1"
                      >
                        <PencilSimple size={14} weight="light" />
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => setDeleteId(note.id)}
                        className="text-text/30 hover:text-red-500 text-xs cursor-pointer flex items-center gap-1"
                      >
                        <Trash size={14} weight="light" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-text/40 mt-2">
                  {new Date(
                    note.observedAt || note.createdAt
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </>
            )}
          </div>
        );
      })}
      {onDelete && (
        <ConfirmDialog
          open={deleteId !== null}
          title="Delete note?"
          description="This action cannot be undone."
          onConfirm={() => {
            if (deleteId !== null) onDelete(deleteId);
            setDeleteId(null);
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
