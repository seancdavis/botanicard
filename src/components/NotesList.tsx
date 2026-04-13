import { Notepad } from "@phosphor-icons/react";
import { EmptyState } from "./EmptyState";

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

interface NotesListProps {
  notes: Note[];
  onDelete?: (id: number) => void;
}

export function NotesList({ notes, onDelete }: NotesListProps) {
  if (notes.length === 0) {
    return (
      <EmptyState
        icon={<Notepad size={48} weight="light" />}
        title="No notes yet"
        description="Add a note to track changes."
      />
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div
          key={note.id}
          className="bg-surface rounded-lg border border-border p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {note.content && (
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              )}
              {/* Photos are attached to their parent note via the photos table,
                  so they render inline here. Each note is a single entry with
                  both text content and photos displayed together. */}
              {note.photos && note.photos.length > 0 && (
                <div className={`flex gap-2 flex-wrap${note.content ? " mt-2" : ""}`}>
                  {note.photos.map((photo) => (
                    <img
                      key={photo.id}
                      src={`/api/photos/${photo.blobKey}`}
                      alt={photo.caption || photo.filename || "Photo"}
                      className="w-24 h-24 object-cover rounded-lg border border-border"
                    />
                  ))}
                </div>
              )}
            </div>
            {onDelete && (
              <button
                onClick={() => onDelete(note.id)}
                className="text-text/30 hover:text-red-500 text-xs"
              >
                Delete
              </button>
            )}
          </div>
          <p className="text-xs text-text/40 mt-2">
            {new Date(note.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      ))}
    </div>
  );
}
