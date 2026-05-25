import { getStore } from "@netlify/blobs";
import { db, photos, planters } from "../../../db";
import { ValidationError } from "../errors";

export async function listOrphanBlobs(): Promise<{ orphanKeys: string[] }> {
  const store = getStore("photos");
  const { blobs } = await store.list();
  const allBlobKeys = blobs.map((b) => b.key);

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

export async function deleteOrphanBlobs(
  keys: unknown,
): Promise<{ deleted: number }> {
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new ValidationError("Must provide a non-empty array of keys");
  }

  const store = getStore("photos");
  for (const key of keys) {
    await store.delete(key);
  }

  return { deleted: keys.length };
}
