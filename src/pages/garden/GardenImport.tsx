import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Trash, Camera, X } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { useData } from "../../lib/useData";
import { useToast } from "../../contexts/ToastContext";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { PageHeader } from "../../components/PageHeader";

interface Season {
  id: number;
  name: string;
  year: number;
}

interface ImportUpdate {
  cardId: string | null;
  plantType: string;
  statusChange: string | null;
  note: string;
}

interface ProcessResult {
  season: { id: number; name: string };
  cells: { id: number; cardId: string; plantType: string; status: string }[];
  updates: ImportUpdate[];
}

interface UploadedPhoto {
  key: string;
  filename: string;
  previewUrl: string;
}

export function GardenImport() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: seasons } = useData<Season[]>("/garden/seasons");

  // Step 1: Input
  const [seasonId, setSeasonId] = useState("");
  const [observationDate, setObservationDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [transcription, setTranscription] = useState("");
  const [processing, setProcessing] = useState(false);

  // Photos (available during input and review)
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Review
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [editableUpdates, setEditableUpdates] = useState<ImportUpdate[]>([]);
  const [confirming, setConfirming] = useState(false);

  const handleProcess = async () => {
    if (!seasonId || !transcription.trim()) return;

    setProcessing(true);
    try {
      const data = await api.post<ProcessResult>("/garden/import/process", {
        seasonId: parseInt(seasonId),
        transcription: transcription.trim(),
      });
      setResult(data);
      setEditableUpdates(data.updates.map((u) => ({ ...u })));
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Processing failed",
        "error"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handlePhotoSelect = async (files: File[]) => {
    setPhotoUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) continue;
        const { key } = await res.json();

        setUploadedPhotos((prev) => [
          ...prev,
          {
            key,
            filename: file.name,
            previewUrl: URL.createObjectURL(file),
          },
        ]);
      } catch {
        // Skip failed uploads
      }
    }
    setPhotoUploading(false);
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const getMatchedCell = (filename: string) => {
    if (!result) return null;
    const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
    const cardIdMatch = nameWithoutExt.match(/^(\d{2}-\d{3})/);
    if (!cardIdMatch) return null;
    return result.cells.find((c) => c.cardId === cardIdMatch[1]) || null;
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      // Save text updates
      const data = await api.post<{
        notesCreated: number;
        statusUpdates: number;
      }>("/garden/import/confirm", {
        updates: editableUpdates.filter((u) => u.cardId),
        observationDate,
      });

      // Attach photos to matched cells
      let photosMatched = 0;
      if (result) {
        for (const photo of uploadedPhotos) {
          const cell = getMatchedCell(photo.filename);
          if (!cell) continue;

          try {
            await api.post("/notes", {
              entityType: "garden_cell",
              entityId: cell.id,
              content: `Photo: ${photo.filename}`,
              photoKeys: [photo.key],
              createdAt: observationDate,
            });
            photosMatched++;
          } catch {
            // Skip failed
          }
        }
      }

      const parts = [];
      if (data.notesCreated > 0) parts.push(`${data.notesCreated} notes`);
      if (data.statusUpdates > 0)
        parts.push(`${data.statusUpdates} status updates`);
      if (photosMatched > 0) parts.push(`${photosMatched} photos`);

      addToast(
        parts.length > 0
          ? `Import log saved: ${parts.join(", ")}`
          : "Import log saved"
      );

      // Clean up preview URLs
      uploadedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));

      navigate(`/garden/seasons/${seasonId}`);
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Confirm failed",
        "error"
      );
    } finally {
      setConfirming(false);
    }
  };

  const removeUpdate = (index: number) => {
    setEditableUpdates((prev) => prev.filter((_, i) => i !== index));
  };

  const updateNote = (index: number, note: string) => {
    setEditableUpdates((prev) =>
      prev.map((u, i) => (i === index ? { ...u, note } : u))
    );
  };

  const updateStatus = (index: number, statusChange: string | null) => {
    setEditableUpdates((prev) =>
      prev.map((u, i) => (i === index ? { ...u, statusChange } : u))
    );
  };

  const photoUploadSection = (
    <Card className="p-5">
      <h3 className="text-lg font-bold mb-2">Photos</h3>
      <p className="text-sm text-text/60 mb-3">
        Attach photos with filenames matching cell IDs (e.g.,{" "}
        <code className="text-xs bg-canvas px-1 py-0.5 rounded">
          26-001.jpg
        </code>
        ). Each photo uploads immediately and is matched to the corresponding
        cell.
      </p>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length)
            handlePhotoSelect(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => photoInputRef.current?.click()}
        disabled={photoUploading}
        className="bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
      >
        <Camera size={16} weight="light" />
        {photoUploading ? "Uploading..." : "Add Photos"}
      </button>

      {uploadedPhotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
          {uploadedPhotos.map((photo, i) => {
            const matchedCell = result ? getMatchedCell(photo.filename) : null;
            return (
              <div
                key={photo.key}
                className="relative rounded-lg overflow-hidden border border-border"
              >
                <img
                  src={photo.previewUrl}
                  alt={photo.filename}
                  className="w-full h-24 object-cover"
                />
                <div className="p-2">
                  <p className="text-xs font-mono text-text/60 truncate">
                    {photo.filename}
                  </p>
                  {result && (
                    <p
                      className={`text-xs mt-0.5 ${
                        matchedCell
                          ? "text-primary font-medium"
                          : "text-orange-500"
                      }`}
                    >
                      {matchedCell
                        ? `${matchedCell.cardId} - ${matchedCell.plantType}`
                        : "No match"}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/70"
                >
                  <X size={12} weight="bold" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  // Show review screen if we have results
  if (result) {
    return (
      <div>
        <PageHeader title="Review Import Log" backTo="/garden/import" />

        <div className="space-y-4 mb-6">
          <p className="text-sm text-text/60">
            {editableUpdates.length} update
            {editableUpdates.length !== 1 ? "s" : ""} parsed from your
            transcription. Review and edit below.
          </p>

          {editableUpdates.map((update, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {update.cardId ? (
                      <span className="text-xs font-mono text-text/40">
                        {update.cardId}
                      </span>
                    ) : (
                      <span className="text-xs text-orange-500 font-medium">
                        Unmatched
                      </span>
                    )}
                    <span className="text-sm font-medium">
                      {update.plantType}
                    </span>
                    {update.statusChange && (
                      <StatusBadge status={update.statusChange} />
                    )}
                  </div>
                  <textarea
                    value={update.note}
                    onChange={(e) => updateNote(i, e.target.value)}
                    rows={2}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  {update.cardId && (
                    <select
                      value={update.statusChange || ""}
                      onChange={(e) =>
                        updateStatus(i, e.target.value || null)
                      }
                      className="mt-2 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">No status change</option>
                      <option value="seeded">Seeded</option>
                      <option value="sprouting">Sprouting</option>
                      <option value="growing">Growing</option>
                      <option value="transplanted">Transplanted</option>
                      <option value="producing">Producing</option>
                      <option value="harvested">Harvested</option>
                      <option value="dead">Dead</option>
                    </select>
                  )}
                </div>
                <button
                  onClick={() => removeUpdate(i)}
                  className="text-text/30 hover:text-red-500"
                >
                  <Trash size={16} weight="light" />
                </button>
              </div>
            </Card>
          ))}
        </div>

        <div className="mb-6">{photoUploadSection}</div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={
              confirming ||
              (editableUpdates.filter((u) => u.cardId).length === 0 &&
                uploadedPhotos.length === 0)
            }
            className="bg-primary text-white rounded-md px-6 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {confirming ? "Saving..." : "Confirm Import Log"}
          </button>
          <button
            onClick={() => {
              setResult(null);
              setEditableUpdates([]);
            }}
            className="border border-border rounded-md px-6 py-2 text-sm hover:bg-canvas"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // Input screen
  return (
    <div>
      <PageHeader title="Garden Import Log" backTo="/garden" />
      <div className="max-w-2xl space-y-4">
        <p className="text-sm text-text/60">
          Paste a transcription of your garden notes. AI will parse them into
          structured updates for your cells.
        </p>

        <div>
          <label className="block text-sm font-medium mb-1">Season *</label>
          <select
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Select season</option>
            {seasons?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Observation Date
          </label>
          <input
            type="date"
            value={observationDate}
            onChange={(e) => setObservationDate(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Transcription *
          </label>
          <textarea
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            rows={10}
            placeholder="Paste your garden notes here... e.g. 'The tomatoes in cell 26-001 are sprouting nicely, about 3 inches tall. The peppers look like they might be dead...'"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div>{photoUploadSection}</div>

        <button
          onClick={handleProcess}
          disabled={processing || !seasonId || !transcription.trim()}
          className="bg-primary text-white rounded-md px-6 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {processing ? "Processing..." : "Process Transcription"}
        </button>
      </div>
    </div>
  );
}
