import type { Config, Context } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { errorResponse } from "../lib/errors";
import {
  createCellGroup,
  deleteCellGroup,
  getCellGroup,
  listCellGroups,
  updateCellGroup,
} from "../lib/services/garden-cell-groups";

export default requireAuth(async (req: Request, _context: Context) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const id = pathParts.length > 3 ? parseInt(pathParts[3], 10) : null;

    if (req.method === "GET" && !id) {
      const seasonParam = url.searchParams.get("season");
      const seasonId = seasonParam ? parseInt(seasonParam, 10) : undefined;
      return Response.json(await listCellGroups(seasonId));
    }

    if (req.method === "GET" && id) {
      return Response.json(await getCellGroup(id));
    }

    if (req.method === "POST") {
      const body = await req.json();
      const created = await createCellGroup(body);
      return Response.json(created, { status: 201 });
    }

    if (req.method === "PUT" && id) {
      const body = await req.json();
      const updated = await updateCellGroup(id, body);
      return Response.json(updated);
    }

    if (req.method === "DELETE" && id) {
      await deleteCellGroup(id);
      return new Response(null, { status: 204 });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    return errorResponse(err, "Garden cell groups API");
  }
});

export const config: Config = {
  path: ["/api/garden/cell-groups", "/api/garden/cell-groups/*"],
};
