import type { Config, Context } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { errorResponse } from "../lib/errors";
import {
  createHouseplant,
  deleteHouseplant,
  getHouseplant,
  listHouseplants,
  updateHouseplant,
} from "../lib/services/houseplants";

export default requireAuth(async (req: Request, _context: Context) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const id = pathParts.length > 2 ? parseInt(pathParts[2], 10) : null;

    if (req.method === "GET" && !id) {
      return Response.json(await listHouseplants());
    }

    if (req.method === "GET" && id) {
      return Response.json(await getHouseplant(id));
    }

    if (req.method === "POST") {
      const body = await req.json();
      const created = await createHouseplant(body);
      return Response.json(created, { status: 201 });
    }

    if (req.method === "PUT" && id) {
      const body = await req.json();
      const updated = await updateHouseplant(id, body);
      return Response.json(updated);
    }

    if (req.method === "DELETE" && id) {
      await deleteHouseplant(id);
      return new Response(null, { status: 204 });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    return errorResponse(err, "Houseplants API");
  }
});

export const config: Config = {
  path: ["/api/houseplants", "/api/houseplants/*"],
};
