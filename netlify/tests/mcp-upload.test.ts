import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/services/photos", () => ({
  uploadPhotoBytes: vi.fn(),
}));

import { uploadPhotoBytes } from "../lib/services/photos";
import uploadHandler from "../functions/mcp-upload";

const TOKEN = "test-bearer-token-xyz";

function uploadRequest(
  body: BodyInit | null,
  init: RequestInit = {},
  query = "",
): Request {
  const { headers: initHeaders, ...rest } = init;
  return new Request(`http://localhost/api/mcp/upload${query}`, {
    method: "POST",
    body,
    ...rest,
    headers: {
      "Content-Type": "image/jpeg",
      Authorization: `Bearer ${TOKEN}`,
      ...(initHeaders as Record<string, string> | undefined),
    },
  });
}

beforeEach(() => {
  process.env.MCP_BEARER_TOKEN = TOKEN;
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.MCP_BEARER_TOKEN;
});

describe("/api/mcp/upload bearer auth", () => {
  it("rejects when Authorization is missing", async () => {
    const res = await uploadHandler(
      new Request("http://localhost/api/mcp/upload", { method: "POST" }),
      {} as never,
    );
    expect(res.status).toBe(401);
  });

  it("rejects when token is wrong", async () => {
    const res = await uploadHandler(
      uploadRequest(new Uint8Array([1, 2, 3]), {
        headers: { Authorization: "Bearer wrong" },
      }),
      {} as never,
    );
    expect(res.status).toBe(401);
  });

  it("rejects when MCP_BEARER_TOKEN env is not set", async () => {
    delete process.env.MCP_BEARER_TOKEN;
    const res = await uploadHandler(
      uploadRequest(new Uint8Array([1, 2, 3])),
      {} as never,
    );
    expect(res.status).toBe(401);
  });
});

describe("/api/mcp/upload HTTP shape", () => {
  it("returns 405 for non-POST methods", async () => {
    const res = await uploadHandler(
      new Request("http://localhost/api/mcp/upload", {
        method: "GET",
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
      {} as never,
    );
    expect(res.status).toBe(405);
  });

  it("rejects non-image content types", async () => {
    const res = await uploadHandler(
      uploadRequest("hello", { headers: { "Content-Type": "text/plain" } }),
      {} as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/image/);
  });

  it("rejects empty bodies", async () => {
    const res = await uploadHandler(
      uploadRequest(new Uint8Array()),
      {} as never,
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/mcp/upload handler", () => {
  it("forwards raw bytes, mimeType, and filename to the service", async () => {
    vi.mocked(uploadPhotoBytes).mockResolvedValue("returned-key");
    const bytes = new Uint8Array([10, 20, 30, 40]);

    const res = await uploadHandler(
      uploadRequest(
        bytes,
        { headers: { "Content-Type": "image/png" } },
        "?filename=garden.png",
      ),
      {} as never,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ key: "returned-key" });

    expect(uploadPhotoBytes).toHaveBeenCalledOnce();
    const [forwardedBytes, filename, mimeType] = vi.mocked(uploadPhotoBytes)
      .mock.calls[0];
    expect(Array.from(forwardedBytes)).toEqual([10, 20, 30, 40]);
    expect(filename).toBe("garden.png");
    expect(mimeType).toBe("image/png");
  });

  it("falls back to a default filename when none is provided", async () => {
    vi.mocked(uploadPhotoBytes).mockResolvedValue("k");

    await uploadHandler(
      uploadRequest(new Uint8Array([1])),
      {} as never,
    );

    const [, filename] = vi.mocked(uploadPhotoBytes).mock.calls[0];
    expect(filename).toBe("upload.bin");
  });

  it("returns 500 when the service throws", async () => {
    vi.mocked(uploadPhotoBytes).mockRejectedValue(new Error("boom"));

    const res = await uploadHandler(
      uploadRequest(new Uint8Array([1, 2])),
      {} as never,
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("boom");
  });
});
