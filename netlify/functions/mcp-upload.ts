/**
 * PUT /api/mcp/upload/blob/:token
 *
 * Verifies the HMAC-signed token, enforces content-type + size constraints,
 * and writes raw bytes to the `uploads` blob store.  No Authorization header
 * is required — the capability is embedded in the signed URL.
 *
 * Returns: { uploadHandle } on success.
 * Errors:  { error: "<code>" } with structured codes:
 *   invalid_signature | expired | already_used |
 *   content_type_mismatch | size_mismatch | empty_body
 */
import type { Config, Context } from "@netlify/functions";
import { ServiceError } from "../lib/errors";
import { verifyUploadToken } from "../lib/mcp/upload-tokens";
import { writeStagedUpload } from "../lib/services/uploads";

export default async (req: Request, context: Context) => {
  if (req.method !== "PUT") {
    return new Response("Method not allowed", { status: 405 });
  }

  const token = context.params?.token;
  if (!token) {
    return Response.json({ error: "missing_token" }, { status: 400 });
  }

  // Verify HMAC signature and expiry
  const verification = verifyUploadToken(token);
  if (!verification.ok) {
    const status = verification.reason === "expired" ? 410 : 401;
    return Response.json({ error: verification.reason }, { status });
  }

  const { payload } = verification;

  // Enforce content-type (byte-exact match)
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType !== payload.contentType) {
    return Response.json(
      {
        error: "content_type_mismatch",
        expected: payload.contentType,
        got: contentType,
      },
      { status: 400 },
    );
  }

  // Read body
  const buf = await req.arrayBuffer();

  if (buf.byteLength === 0) {
    return Response.json({ error: "empty_body" }, { status: 400 });
  }

  // Enforce declared size as an upper bound
  if (buf.byteLength > payload.size) {
    return Response.json(
      {
        error: "size_mismatch",
        declared: payload.size,
        actual: buf.byteLength,
      },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(buf);

  try {
    await writeStagedUpload(payload.uploadId, bytes, payload.contentType);
    return Response.json({ uploadHandle: payload.uploadId });
  } catch (err) {
    if (err instanceof ServiceError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[MCP-upload] error: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/mcp/upload/blob/:token",
};
