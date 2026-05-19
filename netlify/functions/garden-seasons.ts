import type { Config, Context } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { errorResponse } from "../lib/errors";
import {
  createGardenSeason,
  deleteGardenSeason,
  getGardenSeason,
  listGardenSeasons,
  updateGardenSeason,
} from "../lib/services/garden-seasons";

export default requireAuth(async (req: Request, _context: Context) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const id = pathParts.length > 3 ? parseInt(pathParts[3], 10) : null;

    if (req.method === "GET" && !id) {
      return Response.json(await listGardenSeasons());
    }

    if (req.method === "GET" && id) {
      return Response.json(await getGardenSeason(id));
    }

    if (req.method === "POST") {
      const body = await req.json();
      const created = await createGardenSeason(body);
      return Response.json(created, { status: 201 });
    }

    if (req.method === "PUT" && id) {
      const body = await req.json();
      const updated = await updateGardenSeason(id, body);
      return Response.json(updated);
    }

    if (req.method === "DELETE" && id) {
      await deleteGardenSeason(id);
      return new Response(null, { status: 204 });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    return errorResponse(err, "Garden seasons API");
  }
});

export const config: Config = {
  path: ["/api/garden/seasons", "/api/garden/seasons/*"],
};
