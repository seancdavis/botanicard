import type { Config, Context } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { errorResponse } from "../lib/errors";
import {
  createPlanter,
  deletePlanter,
  getPlanter,
  listPlanters,
  updatePlanter,
} from "../lib/services/planters";

export default requireAuth(async (req: Request, _context: Context) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const id = pathParts.length > 2 ? parseInt(pathParts[2], 10) : null;

    if (req.method === "GET" && !id) {
      return Response.json(await listPlanters());
    }

    if (req.method === "GET" && id) {
      return Response.json(await getPlanter(id));
    }

    if (req.method === "POST") {
      const body = await req.json();
      const created = await createPlanter(body);
      return Response.json(created, { status: 201 });
    }

    if (req.method === "PUT" && id) {
      const body = await req.json();
      const updated = await updatePlanter(id, body);
      return Response.json(updated);
    }

    if (req.method === "DELETE" && id) {
      await deletePlanter(id);
      return new Response(null, { status: 204 });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    return errorResponse(err, "Planters API");
  }
});

export const config: Config = {
  path: ["/api/planters", "/api/planters/*"],
};
