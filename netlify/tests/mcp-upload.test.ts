/**
 * Tests for the PUT /api/mcp/upload/blob/:token handler.
 *
 * Both dependencies are mocked so the tests run without a DB or blob store.
 *  - verifyUploadToken: controls token-verification outcomes
 *  - writeStagedUpload: controls the storage write outcome
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/mcp/upload-tokens", () => ({
  verifyUploadToken: vi.fn(),
}));
vi.mock("../lib/services/uploads", () => ({
  writeStagedUpload: vi.fn(),
}));

import { verifyUploadToken } from "../lib/mcp/upload-tokens";
import { writeStagedUpload } from "../lib/services/uploads";
import { ServiceError } from "../lib/errors";
import uploadHandler from "../functions/mcp-upload";

const VALID_PAYLOAD = {
  uploadId: "test-uuid-1234",
  filename: "photo.jpg",
  contentType: "image/jpeg",
  size: 1024,
  exp: Math.floor(Date.now() / 1000) + 300,
};

function makeContext(token = "valid-token") {
  return { params: { token } } as never;
}

function putRequest(
  token: string,
  body: BodyInit | null,
  contentType = "image/jpeg",
): Request {
  return new Request(
    `http://localhost/api/mcp/upload/blob/${token}`,
    {
      method: "PUT",
      body,
      headers: { "Content-Type": contentType },
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Method check
// ---------------------------------------------------------------------------

describe("PUT /api/mcp/upload/blob/:token — method", () => {
  it("returns 405 for non-PUT methods", async () => {
    const res = await uploadHandler(
      new Request("http://localhost/api/mcp/upload/blob/tok", {
        method: "POST",
      }),
      makeContext("tok"),
    );
    expect(res.status).toBe(405);
  });
});

// ---------------------------------------------------------------------------
// Token verification
// ---------------------------------------------------------------------------

describe("PUT /api/mcp/upload/blob/:token — token checks", () => {
  it("returns 401 when token signature is invalid", async () => {
    vi.mocked(verifyUploadToken).mockReturnValue({
      ok: false,
      reason: "invalid_signature",
    });

    const res = await uploadHandler(
      putRequest("bad-token", new Uint8Array([1, 2, 3])),
      makeContext("bad-token"),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("invalid_signature");
  });

  it("returns 410 when token is expired", async () => {
    vi.mocked(verifyUploadToken).mockReturnValue({
      ok: false,
      reason: "expired",
    });

    const res = await uploadHandler(
      putRequest("expired-token", new Uint8Array([1, 2, 3])),
      makeContext("expired-token"),
    );
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toBe("expired");
  });

  it("returns 401 for a malformed token", async () => {
    vi.mocked(verifyUploadToken).mockReturnValue({
      ok: false,
      reason: "malformed",
    });

    const res = await uploadHandler(
      putRequest("malformed", new Uint8Array([1])),
      makeContext("malformed"),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("malformed");
  });
});

// ---------------------------------------------------------------------------
// Content-type enforcement
// ---------------------------------------------------------------------------

describe("PUT /api/mcp/upload/blob/:token — content-type", () => {
  beforeEach(() => {
    vi.mocked(verifyUploadToken).mockReturnValue({
      ok: true,
      payload: VALID_PAYLOAD,
    });
  });

  it("returns 400 when content-type does not match the declared type", async () => {
    const res = await uploadHandler(
      putRequest("tok", new Uint8Array([1, 2, 3]), "image/png"),
      makeContext("tok"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("content_type_mismatch");
    expect(body.expected).toBe("image/jpeg");
    expect(body.got).toBe("image/png");
  });
});

// ---------------------------------------------------------------------------
// Body size enforcement
// ---------------------------------------------------------------------------

describe("PUT /api/mcp/upload/blob/:token — size", () => {
  beforeEach(() => {
    vi.mocked(verifyUploadToken).mockReturnValue({
      ok: true,
      payload: VALID_PAYLOAD,
    });
  });

  it("returns 400 for an empty body", async () => {
    const res = await uploadHandler(
      putRequest("tok", new Uint8Array()),
      makeContext("tok"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("empty_body");
  });

  it("returns 413 when the body exceeds the declared size", async () => {
    // VALID_PAYLOAD.size = 1024; send 1025 bytes
    const oversized = new Uint8Array(1025).fill(0xff);
    const res = await uploadHandler(
      putRequest("tok", oversized),
      makeContext("tok"),
    );
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toBe("size_mismatch");
    expect(body.declared).toBe(1024);
    expect(body.actual).toBe(1025);
  });

  it("accepts a body smaller than the declared size", async () => {
    vi.mocked(writeStagedUpload).mockResolvedValue(undefined);
    const small = new Uint8Array(10).fill(0x01);
    const res = await uploadHandler(
      putRequest("tok", small),
      makeContext("tok"),
    );
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Happy path + round-trip bytes
// ---------------------------------------------------------------------------

describe("PUT /api/mcp/upload/blob/:token — happy path", () => {
  beforeEach(() => {
    vi.mocked(verifyUploadToken).mockReturnValue({
      ok: true,
      payload: VALID_PAYLOAD,
    });
    vi.mocked(writeStagedUpload).mockResolvedValue(undefined);
  });

  it("forwards raw bytes to writeStagedUpload and returns uploadHandle", async () => {
    const bytes = new Uint8Array([10, 20, 30, 40]);
    const res = await uploadHandler(
      putRequest("tok", bytes),
      makeContext("tok"),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ uploadHandle: VALID_PAYLOAD.uploadId });

    expect(writeStagedUpload).toHaveBeenCalledOnce();
    const [uploadId, forwardedBytes, contentType] =
      vi.mocked(writeStagedUpload).mock.calls[0];
    expect(uploadId).toBe(VALID_PAYLOAD.uploadId);
    expect(Array.from(forwardedBytes)).toEqual([10, 20, 30, 40]);
    expect(contentType).toBe("image/jpeg");
  });
});

// ---------------------------------------------------------------------------
// Single-use enforcement
// ---------------------------------------------------------------------------

describe("PUT /api/mcp/upload/blob/:token — single-use", () => {
  it("returns 409 when the slot has already been claimed", async () => {
    vi.mocked(verifyUploadToken).mockReturnValue({
      ok: true,
      payload: VALID_PAYLOAD,
    });
    vi.mocked(writeStagedUpload).mockRejectedValue(
      new ServiceError("already_used", 409),
    );

    const bytes = new Uint8Array([1, 2, 3]);
    const res = await uploadHandler(
      putRequest("tok", bytes),
      makeContext("tok"),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("already_used");
  });
});

// ---------------------------------------------------------------------------
// Storage error
// ---------------------------------------------------------------------------

describe("PUT /api/mcp/upload/blob/:token — storage error", () => {
  it("returns 500 when writeStagedUpload throws an unexpected error", async () => {
    vi.mocked(verifyUploadToken).mockReturnValue({
      ok: true,
      payload: VALID_PAYLOAD,
    });
    vi.mocked(writeStagedUpload).mockRejectedValue(new Error("boom"));

    const res = await uploadHandler(
      putRequest("tok", new Uint8Array([1])),
      makeContext("tok"),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("boom");
  });
});
