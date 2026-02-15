import { useState, useRef } from "react";
import { Camera } from "@phosphor-icons/react";
import { api } from "../lib/api";
import { useToast } from "../contexts/ToastContext";

interface AddNoteFormProps {
  entityType: string;
  entityId: number;
  onNoteAdded: () => void;
}

export function AddNoteForm({ entityType, entityId, onNoteAdded }: AddNoteFormProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;

    setSubmitting(true);
    try {
      // Upload photos first if any
      const photoKeys: string[] = [];
      for (const file of files) {
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

      await api.post("/notes", {
        entityType,
        entityId,
        content: content.trim() || undefined,
        photoKeys,
      });

      setContent("");
      setFiles([]);
      onNoteAdded();
      addToast("Note added");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to add note", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a note..."
        rows={3}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-text/40 hover:text-text/70 transition-colors"
          >
            <Camera size={20} weight="light" />
          </button>
          {files.length > 0 && (
            <span className="text-xs text-text/50">
              {files.length} photo{files.length > 1 ? "s" : ""}
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
        </div>
        <button
          type="submit"
          disabled={submitting || (!content.trim() && files.length === 0)}
          className="bg-primary text-white rounded-md px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Add Note"}
        </button>
      </div>
    </form>
  );
}
