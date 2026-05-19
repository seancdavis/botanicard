import type { Config, Context } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { errorResponse } from "../lib/errors";
import {
  createNote,
  deleteNote,
  updateNote,
} from "../lib/services/notes";

export default requireAuth(async (req: Request, _context: Context) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const id = pathParts.length > 2 ? parseInt(pathParts[2], 10) : null;

    if (req.method === "POST") {
      const body = await req.json();
      const note = await createNote(body);
      return Response.json(note, { status: 201 });
    }

    if (req.method === "PUT" && id) {
      const body = await req.json();
      const updated = await updateNote(id, body);
      return Response.json(updated);
    }

    if (req.method === "DELETE" && id) {
      await deleteNote(id);
      return new Response(null, { status: 204 });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    return errorResponse(err, "Notes API");
  }
});

export const config: Config = {
  path: ["/api/notes", "/api/notes/*"],
};
