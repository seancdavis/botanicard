import { getStore } from "@netlify/blobs";
import { and, eq } from "drizzle-orm";
import { db, uploadHandles } from "../../../db";
import { NotFoundError, ServiceError, ValidationError } from "../errors";
import {
  signUploadToken,
  type UploadTokenPayload,
} from "../mcp/upload-tokens";

/** Signed URL TTL. Matches the `exp` baked into the token. */
const UPLOAD_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface PrepareUploadInput {
  filename: string;
  contentType: string;
  /** Declared upper-bound size in bytes. */
  size: number;
}

/**
 * Allocate an upload slot, sign a short-lived token, and return the PUT URL
 * plus an opaque handle the agent passes to finalizeUpload.
 */
export async function prepareUpload(
  input: PrepareUploadInput,
): Promise<{ uploadUrl: string; uploadHandle: string }> {
  if (!input.filename) throw new ValidationError("filename is required");
  if (!input.contentType) throw new ValidationError("contentType is required");
  if (typeof input.size !== "number" || input.size <= 0) {
    throw new ValidationError("size must be a positive number");
  }

  const uploadId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + UPLOAD_TTL_MS);

  await db.insert(uploadHandles).values({
    uploadId,
    status: "pending",
    contentType: input.contentType,
    declaredSize: input.size,
    filename: input.filename,
    expiresAt,
  });

  const payload: UploadTokenPayload = {
    uploadId,
    filename: input.filename,
    contentType: input.contentType,
    size: input.size,
    exp: Math.floor(expiresAt.getTime() / 1000),
  };

  const token = signUploadToken(payload);
  // Netlify sets process.env.URL to the site URL; fall back to empty string
  // in environments where it isn't available (the caller gets a relative path).
  const baseUrl = process.env.URL ?? "";
  const uploadUrl = `${baseUrl}/api/mcp/upload/blob/${token}`;

  console.info("[MCP] prepare_upload ok", uploadId);
  return { uploadUrl, uploadHandle: uploadId };
}

/**
 * Atomically claim the upload slot (pending → uploaded) and write raw bytes
 * to the `uploads` blob store at `staging/<uploadId>`.
 *
 * Throws ServiceError(409) if the slot has already been claimed.
 */
export async function writeStagedUpload(
  uploadId: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  // Atomic single-use claim: only succeeds while status is still 'pending'.
  const updated = await db
    .update(uploadHandles)
    .set({ status: "uploaded", uploadedSize: bytes.byteLength })
    .where(
      and(
        eq(uploadHandles.uploadId, uploadId),
        eq(uploadHandles.status, "pending"),
      ),
    )
    .returning({ uploadId: uploadHandles.uploadId });

  if (updated.length === 0) {
    throw new ServiceError("already_used", 409);
  }

  const store = getStore("uploads");
  const blobKey = `staging/${uploadId}`;
  await store.set(blobKey, bytes, { metadata: { contentType } });

  console.info(`[MCP] mcp-upload ok ${uploadId} (${bytes.byteLength} bytes)`);
}

/**
 * Verify the blob exists, transition the handle to `finalized`, and return
 * the stable blob key the agent can pass to create_note / update_planter.
 */
export async function finalizeUpload(
  uploadHandle: string,
): Promise<{ key: string }> {
  const [row] = await db
    .select()
    .from(uploadHandles)
    .where(eq(uploadHandles.uploadId, uploadHandle));

  if (!row) {
    throw new NotFoundError("Upload handle not found");
  }
  if (row.status === "pending") {
    throw new ValidationError(
      "File has not been uploaded yet — PUT raw bytes to the uploadUrl first",
    );
  }
  if (row.status === "finalized") {
    throw new ValidationError("Upload has already been finalized");
  }
  if (row.status !== "uploaded") {
    throw new ValidationError(`Unexpected upload status: ${row.status}`);
  }

  const blobKey = `staging/${uploadHandle}`;
  const store = getStore("uploads");
  const blob = await store.get(blobKey, { type: "arrayBuffer" });
  if (!blob) {
    throw new ValidationError("Uploaded file not found in storage");
  }

  await db
    .update(uploadHandles)
    .set({ status: "finalized" })
    .where(eq(uploadHandles.uploadId, uploadHandle));

  console.info("[MCP] finalize_upload ok", uploadHandle);
  return { key: blobKey };
}
