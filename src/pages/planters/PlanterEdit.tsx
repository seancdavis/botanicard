import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Camera, X } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { useData } from "../../lib/useData";
import { useToast } from "../../contexts/ToastContext";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";

interface Planter {
  id: number;
  cardId: string;
  name: string;
  description?: string;
  photoBlobKey?: string | null;
  status: string;
}

export function PlanterEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: planter, loading } = useData<Planter>(`/planters/${id}`);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingBlobKey, setExistingBlobKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (planter) {
      setName(planter.name);
      setDescription(planter.description || "");
      setStatus(planter.status);
      setExistingBlobKey(planter.photoBlobKey || null);
    }
  }, [planter]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setExistingBlobKey(null);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setExistingBlobKey(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-48 w-full max-w-lg" />
      </div>
    );
  }

  if (!planter) {
    return <div className="text-text/50">Planter not found.</div>;
  }

  const currentPhotoSrc = photoPreview
    || (existingBlobKey ? `/api/photos/${existingBlobKey}` : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      let photoBlobKey: string | null | undefined;
      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        const res = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Photo upload failed");
        const data = await res.json();
        photoBlobKey = data.key;
      } else if (!existingBlobKey && planter.photoBlobKey) {
        // Photo was removed
        photoBlobKey = null;
      }

      await api.put(`/planters/${id}`, {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        photoBlobKey,
      });
      addToast("Planter updated");
      navigate(`/planters/${id}`);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to update", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title={`Edit ${planter.name}`} backTo={`/planters/${id}`} />
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Photo</label>
          {currentPhotoSrc ? (
            <div className="relative">
              <img
                src={currentPhotoSrc}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-text/40 hover:text-text/60 hover:border-text/30 transition-colors"
            >
              <Camera size={24} weight="light" />
              <span className="text-sm">Add photo</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
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
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="broken">Broken</option>
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
            onClick={() => navigate(`/planters/${id}`)}
            className="border border-border rounded-md px-6 py-2 text-sm hover:bg-canvas"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
