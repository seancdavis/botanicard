import type { Config, Context } from "@netlify/functions";
import { checkBearer } from "../lib/mcp/bearer";
import { uploadPhotoBytes } from "../lib/services/photos";

export default async (req: Request, _context: Context) => {
  if (!checkBearer(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const mimeType = req.headers.get("content-type") ?? "";
  if (!mimeType.startsWith("image/")) {
    return Response.json(
      { error: "Content-Type must be image/*" },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const filename = url.searchParams.get("filename") ?? "upload.bin";

  try {
    const buf = await req.arrayBuffer();
    if (buf.byteLength === 0) {
      return Response.json({ error: "Empty body" }, { status: 400 });
    }
    const bytes = new Uint8Array(buf);
    const key = await uploadPhotoBytes(bytes, filename, mimeType);
    console.info(`[MCP-upload] ok ${key} (${bytes.byteLength} bytes)`);
    return Response.json({ key });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[MCP-upload] error: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/mcp/upload",
};
