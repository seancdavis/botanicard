import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { db, photos, planters } from "../../db";

export default async (req: Request, _context: Context) => {
  try {
    // GET — list orphan blobs
    if (req.method === "GET") {
      const store = getStore("photos");
      const { blobs } = await store.list();
      const allBlobKeys = blobs.map((b) => b.key);

      if (allBlobKeys.length === 0) {
        return Response.json({ orphanKeys: [] });
      }

      // Get all referenced blob keys from photos and planters
      const photoRows = await db
        .select({ blobKey: photos.blobKey })
        .from(photos);
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

      const orphanKeys = allBlobKeys.filter((key) => !referencedKeys.has(key));

      return Response.json({ orphanKeys });
    }

    // POST — delete specified orphan blobs
    if (req.method === "POST") {
      const { keys } = (await req.json()) as { keys: string[] };

      if (!Array.isArray(keys) || keys.length === 0) {
        return Response.json(
          { error: "Must provide a non-empty array of keys" },
          { status: 400 }
        );
      }

      const store = getStore("photos");

      for (const key of keys) {
        await store.delete(key);
      }

      return Response.json({ deleted: keys.length });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error("blob-cleanup error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};

export const config: Config = {
  path: ["/api/admin/blob-cleanup"],
};
