import type { Config, Context } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { errorResponse } from "../lib/errors";
import { getPhoto, uploadPhoto } from "../lib/services/photos";

export default requireAuth(async (req: Request, _context: Context) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // POST /api/photos/upload
    if (req.method === "POST" && pathParts[2] === "upload") {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const key = await uploadPhoto(file);
      return Response.json({ key });
    }

    // GET /api/photos/:key
    if (req.method === "GET" && pathParts.length > 2) {
      const key = pathParts.slice(2).join("/");
      const result = await getPhoto(key);
      if (!result) return new Response("Not found", { status: 404 });

      return new Response(result.data, {
        headers: {
          "Content-Type": result.contentType,
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    return errorResponse(err, "Photos API");
  }
});

export const config: Config = {
  path: "/api/photos/*",
};
