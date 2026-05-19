import type { Config, Context } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { errorResponse } from "../lib/errors";
import {
  deleteOrphanBlobs,
  listOrphanBlobs,
} from "../lib/services/blob-cleanup";

export default requireAuth(async (req: Request, _context: Context) => {
  try {
    if (req.method === "GET") {
      return Response.json(await listOrphanBlobs());
    }

    if (req.method === "POST") {
      const { keys } = (await req.json()) as { keys: unknown };
      return Response.json(await deleteOrphanBlobs(keys));
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    return errorResponse(err, "blob-cleanup");
  }
});

export const config: Config = {
  path: ["/api/admin/blob-cleanup"],
};
