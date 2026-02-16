import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);

  // POST /api/photos/upload
  if (req.method === "POST" && pathParts[2] === "upload") {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const store = getStore("photos");
    const key = `${Date.now()}-${file.name}`;
    const buffer = await file.arrayBuffer();
    await store.set(key, new Uint8Array(buffer), {
      metadata: { contentType: file.type },
    });

    return Response.json({ key });
  }

  // GET /api/photos/:key
  if (req.method === "GET" && pathParts.length > 2) {
    const key = pathParts.slice(2).join("/");
    const store = getStore("photos");

    try {
      const blob = await store.get(key, { type: "arrayBuffer" });
      if (!blob) {
        return new Response("Not found", { status: 404 });
      }

      const meta = await store.getMetadata(key);
      const contentType =
        (meta?.metadata as Record<string, string>)?.contentType ||
        "image/jpeg";

      return new Response(blob, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/photos/*",
};
