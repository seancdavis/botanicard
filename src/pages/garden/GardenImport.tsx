import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Trash } from "@phosphor-icons/react";
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

export function GardenImport() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: seasons } = useData<Season[]>("/garden/seasons");

  // Step 1: Input
  const [seasonId, setSeasonId] = useState("");
  const [transcription, setTranscription] = useState("");
  const [processing, setProcessing] = useState(false);

  // Step 2: Review
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [editableUpdates, setEditableUpdates] = useState<ImportUpdate[]>([]);
  const [confirming, setConfirming] = useState(false);

  // Step 3: Photo upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const data = await api.post<{
        notesCreated: number;
        statusUpdates: number;
      }>("/garden/import/confirm", {
        updates: editableUpdates.filter((u) => u.cardId),
      });
      addToast(
        `Import complete: ${data.notesCreated} notes, ${data.statusUpdates} status updates`
      );
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

  const handlePhotoUpload = async (files: FileList) => {
    if (!result) return;
    setUploading(true);

    let matched = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Uploading ${i + 1}/${files.length}: ${file.name}`);

      // Parse card_id from filename (e.g., "26-001.jpg" or "26-001-2.jpg")
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
      const cardIdMatch = nameWithoutExt.match(/^(\d{2}-\d{3})/);
      if (!cardIdMatch) continue;

      const cardId = cardIdMatch[1];
      const cell = result.cells.find((c) => c.cardId === cardId);
      if (!cell) continue;

      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) continue;
        const { key } = await uploadRes.json();

        await api.post("/notes", {
          entityType: "garden_cell",
          entityId: cell.id,
          content: `Photo: ${file.name}`,
          photoKeys: [key],
        });
        matched++;
      } catch {
        // Skip failed uploads
      }
    }

    setUploading(false);
    setUploadProgress("");
    addToast(`${matched} photo${matched !== 1 ? "s" : ""} uploaded and matched`);
  };

  // Show review screen if we have results
  if (result) {
    return (
      <div>
        <PageHeader title="Review Import" backTo="/garden/import" />

        <div className="space-y-4 mb-6">
          <p className="text-sm text-text/60">
            {editableUpdates.length} update{editableUpdates.length !== 1 ? "s" : ""}{" "}
            parsed from your transcription. Review and edit below.
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

        <div className="flex gap-3 mb-8">
          <button
            onClick={handleConfirm}
            disabled={
              confirming || editableUpdates.filter((u) => u.cardId).length === 0
            }
            className="bg-primary text-white rounded-md px-6 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {confirming ? "Saving..." : "Confirm Import"}
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

        {/* Bulk Photo Upload */}
        <Card className="p-5">
          <h3 className="text-lg font-bold mb-2">Bulk Photo Upload</h3>
          <p className="text-sm text-text/60 mb-3">
            Upload photos with filenames matching cell IDs (e.g.,{" "}
            <code className="text-xs bg-canvas px-1 py-0.5 rounded">
              26-001.jpg
            </code>
            ). They'll be automatically matched to cells.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handlePhotoUpload(e.target.files);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-accent text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? uploadProgress : "Select Photos"}
          </button>
        </Card>
      </div>
    );
  }

  // Input screen
  return (
    <div>
      <PageHeader title="Garden Import" backTo="/garden" />
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
