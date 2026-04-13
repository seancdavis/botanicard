import { useState, useEffect, useCallback } from "react";
import { WarningCircle, Trash, ImageBroken } from "@phosphor-icons/react";
import { PageHeader, Card, EmptyState } from "../../components";
import { api } from "../../lib/api";

interface OrphanBlobsResponse {
  orphanKeys: string[];
}

interface DeleteResponse {
  deleted: number;
}

export function BlobCleanup() {
  const [orphanKeys, setOrphanKeys] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchOrphans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<OrphanBlobsResponse>(
        "/admin/blob-cleanup"
      );
      setOrphanKeys(data.orphanKeys);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orphan blobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrphans();
  }, [fetchOrphans]);

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === orphanKeys.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orphanKeys));
    }
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    setDeleting(true);
    try {
      await api.post<DeleteResponse>("/admin/blob-cleanup", {
        keys: Array.from(selected),
      });
      await fetchOrphans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete blobs");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Blob Cleanup" backTo="/" />
        <div className="text-text/50 text-center py-16">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Blob Cleanup" backTo="/" />
        <EmptyState
          icon={<WarningCircle size={48} weight="light" />}
          title="Error loading orphan blobs"
          description={error}
          action={
            <button
              onClick={fetchOrphans}
              className="bg-primary text-white rounded-md px-4 py-2"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  if (orphanKeys.length === 0) {
    return (
      <div>
        <PageHeader title="Blob Cleanup" backTo="/" />
        <EmptyState
          icon={<ImageBroken size={48} weight="light" />}
          title="No orphan blobs found"
          description="All blob images are referenced by a photo or planter record."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Blob Cleanup"
        backTo="/"
        actions={
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={selected.size === 0 || deleting}
            className="bg-primary text-white rounded-md px-4 py-2 disabled:opacity-40"
          >
            <span className="flex items-center gap-2">
              <Trash size={18} weight="light" />
              {deleting ? "Deleting..." : `Delete Selected (${selected.size})`}
            </span>
          </button>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-text/70 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.size === orphanKeys.length}
            onChange={toggleSelectAll}
            className="rounded"
          />
          Select All ({orphanKeys.length} orphan{orphanKeys.length !== 1 ? "s" : ""})
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {orphanKeys.map((key) => (
          <Card
            key={key}
            className="overflow-hidden cursor-pointer"
            onClick={() => toggleSelect(key)}
          >
            <div className="relative">
              <img
                src={`/api/photos/${key}`}
                alt={key}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              <div className="absolute top-2 left-2">
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => toggleSelect(key)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded"
                />
              </div>
            </div>
            <div className="p-2">
              <p className="text-xs text-text/50 truncate" title={key}>
                {key}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Confirm Deletion</h3>
            <p className="text-sm text-text/70 mb-4">
              Are you sure you want to permanently delete {selected.size} blob
              {selected.size !== 1 ? "s" : ""}? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-md px-4 py-2 border border-border text-text/70"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white rounded-md px-4 py-2"
              >
                Delete
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
