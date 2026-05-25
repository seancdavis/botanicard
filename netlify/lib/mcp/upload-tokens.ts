/**
 * HMAC-SHA256 signed upload tokens for the presigned-upload flow.
 *
 * Token format: <base64url(JSON payload)>.<base64url(HMAC-SHA256 signature)>
 *
 * The signing secret is read from MCP_UPLOAD_SIGNING_SECRET at call time.
 * If the env var is missing every call throws — same posture as bearer.ts.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface UploadTokenPayload {
  /** UUID that matches the upload_handles row. */
  uploadId: string;
  filename: string;
  contentType: string;
  /** Declared upper-bound byte count. */
  size: number;
  /** Unix timestamp (seconds) after which the token is rejected. */
  exp: number;
}

function getSecret(): string {
  const secret = process.env.MCP_UPLOAD_SIGNING_SECRET;
  if (!secret) {
    throw new Error(
      "MCP_UPLOAD_SIGNING_SECRET is not set; upload token operations are disabled",
    );
  }
  return secret;
}

function bufToBase64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function payloadPart(payload: UploadTokenPayload): string {
  return bufToBase64url(Buffer.from(JSON.stringify(payload)));
}

/** Sign a payload and return a compact `<header>.<sig>` token string. */
export function signUploadToken(payload: UploadTokenPayload): string {
  const secret = getSecret();
  const header = payloadPart(payload);
  const sig = createHmac("sha256", secret).update(header).digest();
  return `${header}.${bufToBase64url(sig)}`;
}

export type VerifyResult =
  | { ok: true; payload: UploadTokenPayload }
  | { ok: false; reason: "invalid_signature" | "expired" | "malformed" };

/** Verify a token string. Returns payload on success, or a typed failure. */
export function verifyUploadToken(token: string): VerifyResult {
  const secret = getSecret();

  const dotIdx = token.lastIndexOf(".");
  if (dotIdx < 1 || dotIdx === token.length - 1) {
    return { ok: false, reason: "malformed" };
  }

  const header = token.slice(0, dotIdx);
  const sigPart = token.slice(dotIdx + 1);

  // Reconstruct expected signature
  const expectedSig = createHmac("sha256", secret).update(header).digest();

  let actualSig: Buffer;
  try {
    actualSig = Buffer.from(sigPart, "base64url");
  } catch {
    return { ok: false, reason: "invalid_signature" };
  }

  if (
    actualSig.length !== expectedSig.length ||
    !timingSafeEqual(actualSig, expectedSig)
  ) {
    return { ok: false, reason: "invalid_signature" };
  }

  // Decode payload
  let payload: UploadTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(header, "base64url").toString("utf8"),
    ) as UploadTokenPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  // Check expiry
  if (Math.floor(Date.now() / 1000) > payload.exp) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload };
}
