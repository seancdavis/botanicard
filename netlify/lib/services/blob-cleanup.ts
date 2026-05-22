import { getStore } from "@netlify/blobs";
import { db, photos, planters } from "../../../db";
import { ValidationError } from "../errors";

/**
 * List blob keys from both the `photos` store (legacy) and the `uploads`
 * store (new presigned-URL flow) that are not referenced by any photo row
 * or planter record.
 */
export async function listOrphanBlobs(): Promise<{ orphanKeys: string[] }> {
  const photosStore = getStore("photos");
  const uploadsStore = getStore("uploads");

  const [photosResult, uploadsResult] = await Promise.all([
    photosStore.list(),
    uploadsStore.list(),
  ]);

  const allBlobKeys = [
    ...photosResult.blobs.map((b) => b.key),
    ...uploadsResult.blobs.map((b) => b.key),
  ];

  if (allBlobKeys.length === 0) {
    return { orphanKeys: [] };
  }

  const photoRows = await db.select({ blobKey: photos.blobKey }).from(photos);
  const planterRows = await db
    .select({ photoBlobKey: planters.photoBlobKey })
    .from(planters);

  const referencedKeys = new Set<string>();
  for (const row of photoRows) {
    referencedKeys.add(row.blobKey);
  }
  for (const row of planterRows) {
    if (row.photoBlobKey) {
      referencedKeys.add(row.photoBlobKey);
    }
  }

  return {
    orphanKeys: allBlobKeys.filter((key) => !referencedKeys.has(key)),
  };
}

/**
 * Delete the given blob keys.  Keys from the `uploads` store are identified
 * by their `staging/` prefix; all other keys are assumed to be in `photos`.
 */
export async function deleteOrphanBlobs(
  keys: unknown,
): Promise<{ deleted: number }> {
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new ValidationError("Must provide a non-empty array of keys");
  }

  const photosStore = getStore("photos");
  const uploadsStore = getStore("uploads");

  for (const key of keys) {
    const store = String(key).startsWith("staging/") ? uploadsStore : photosStore;
    await store.delete(key);
  }

  return { deleted: keys.length };
}
