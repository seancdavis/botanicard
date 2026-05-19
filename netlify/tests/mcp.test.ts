import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/services/houseplants", () => ({
  listHouseplants: vi.fn(),
  getHouseplant: vi.fn(),
  createHouseplant: vi.fn(),
  updateHouseplant: vi.fn(),
}));
vi.mock("../lib/services/planters", () => ({
  listPlanters: vi.fn(),
  getPlanter: vi.fn(),
  createPlanter: vi.fn(),
  updatePlanter: vi.fn(),
}));
vi.mock("../lib/services/garden-cell-groups", () => ({
  listCellGroups: vi.fn(),
  getCellGroup: vi.fn(),
  createCellGroup: vi.fn(),
  updateCellGroup: vi.fn(),
}));
vi.mock("../lib/services/notes", () => ({
  createNote: vi.fn(),
  updateNote: vi.fn(),
}));
vi.mock("../lib/services/photos", () => ({
  uploadPhotoBytes: vi.fn(),
  getPhoto: vi.fn(),
}));

import { listHouseplants, createHouseplant } from "../lib/services/houseplants";
import { createNote } from "../lib/services/notes";
import { getPhoto, uploadPhotoBytes } from "../lib/services/photos";
import { ValidationError } from "../lib/errors";
import mcpHandler from "../functions/mcp";

const TOKEN = "test-bearer-token-xyz";

function authedRequest(body: unknown, token = TOKEN): Request {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.MCP_BEARER_TOKEN = TOKEN;
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.MCP_BEARER_TOKEN;
});

describe("MCP bearer auth", () => {
  it("rejects when Authorization header is missing", async () => {
    const res = await mcpHandler(
      new Request("http://localhost/api/mcp", { method: "POST" }),
      {} as never,
    );
    expect(res.status).toBe(401);
  });

  it("rejects when token is wrong", async () => {
    const res = await mcpHandler(
      authedRequest({ jsonrpc: "2.0", id: 1, method: "ping" }, "wrong"),
      {} as never,
    );
    expect(res.status).toBe(401);
  });

  it("rejects when MCP_BEARER_TOKEN env is not set", async () => {
    delete process.env.MCP_BEARER_TOKEN;
    const res = await mcpHandler(
      authedRequest({ jsonrpc: "2.0", id: 1, method: "ping" }),
      {} as never,
    );
    expect(res.status).toBe(401);
  });

  it("accepts a valid bearer token", async () => {
    const res = await mcpHandler(
      authedRequest({ jsonrpc: "2.0", id: 1, method: "ping" }),
      {} as never,
    );
    expect(res.status).toBe(200);
  });
});

describe("MCP HTTP shape", () => {
  it("returns 405 for non-POST methods", async () => {
    const res = await mcpHandler(
      new Request("http://localhost/api/mcp", {
        method: "GET",
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
      {} as never,
    );
    expect(res.status).toBe(405);
  });

  it("returns a parse error for malformed JSON", async () => {
    const res = await mcpHandler(authedRequest("not-json"), {} as never);
    const body = await res.json();
    expect(body.error.code).toBe(-32700);
  });

  it("returns an invalid-request error for a non-RPC payload", async () => {
    const res = await mcpHandler(authedRequest({ foo: "bar" }), {} as never);
    const body = await res.json();
    expect(body.error.code).toBe(-32600);
  });

  it("returns 204 for notifications (no id)", async () => {
    const res = await mcpHandler(
      authedRequest({ jsonrpc: "2.0", method: "notifications/initialized" }),
      {} as never,
    );
    expect(res.status).toBe(204);
  });
});

describe("MCP protocol methods", () => {
  it("initialize returns server info and capabilities", async () => {
    const res = await mcpHandler(
      authedRequest({ jsonrpc: "2.0", id: 1, method: "initialize" }),
      {} as never,
    );
    const body = await res.json();
    expect(body.id).toBe(1);
    expect(body.result.serverInfo.name).toBe("botanicard");
    expect(body.result.capabilities).toHaveProperty("tools");
    expect(typeof body.result.protocolVersion).toBe("string");
  });

  it("tools/list returns all 16 tools by name", async () => {
    const res = await mcpHandler(
      authedRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      {} as never,
    );
    const body = await res.json();
    const names = body.result.tools.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual(
      [
        "create_garden_cell_group",
        "create_houseplant",
        "create_note",
        "create_planter",
        "get_garden_cell_group",
        "get_houseplant",
        "get_photo",
        "get_planter",
        "list_garden_cell_groups",
        "list_houseplants",
        "list_planters",
        "update_garden_cell_group",
        "update_houseplant",
        "update_note",
        "update_planter",
        "upload_photo",
      ].sort(),
    );
  });

  it("returns method-not-found for unknown methods", async () => {
    const res = await mcpHandler(
      authedRequest({ jsonrpc: "2.0", id: 3, method: "unknown/thing" }),
      {} as never,
    );
    const body = await res.json();
    expect(body.error.code).toBe(-32601);
  });
});

describe("MCP tools/call", () => {
  it("dispatches to the right service and wraps the result as text content", async () => {
    vi.mocked(listHouseplants).mockResolvedValue([
      { id: 1, name: "basil" },
    ] as never);

    const res = await mcpHandler(
      authedRequest({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "list_houseplants", arguments: {} },
      }),
      {} as never,
    );
    const body = await res.json();

    expect(listHouseplants).toHaveBeenCalledOnce();
    expect(body.result.content[0].type).toBe("text");
    const parsed = JSON.parse(body.result.content[0].text);
    expect(parsed).toEqual([{ id: 1, name: "basil" }]);
    expect(body.result.isError).toBeUndefined();
  });

  it("passes typed arguments to the service", async () => {
    vi.mocked(createHouseplant).mockResolvedValue({ id: 7 } as never);

    await mcpHandler(
      authedRequest({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "create_houseplant",
          arguments: { name: "fern", planterId: 3 },
        },
      }),
      {} as never,
    );

    expect(createHouseplant).toHaveBeenCalledWith({
      name: "fern",
      description: null,
      parentId: null,
      planterId: 3,
      status: undefined,
    });
  });

  it("returns isError true when the tool throws a ValidationError", async () => {
    vi.mocked(createNote).mockRejectedValue(
      new ValidationError("entityType and entityId are required"),
    );

    const res = await mcpHandler(
      authedRequest({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "create_note",
          arguments: { entityType: "houseplant", entityId: 1 },
        },
      }),
      {} as never,
    );
    const body = await res.json();
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain(
      "entityType and entityId are required",
    );
  });

  it("returns isError true for an unknown tool", async () => {
    const res = await mcpHandler(
      authedRequest({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: { name: "nope", arguments: {} },
      }),
      {} as never,
    );
    const body = await res.json();
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain("Unknown tool: nope");
  });

  it("upload_photo decodes base64 and calls the service with bytes", async () => {
    vi.mocked(uploadPhotoBytes).mockResolvedValue("test-key");
    const original = "hello world";
    const dataB64 = Buffer.from(original).toString("base64");

    const res = await mcpHandler(
      authedRequest({
        jsonrpc: "2.0",
        id: 8,
        method: "tools/call",
        params: {
          name: "upload_photo",
          arguments: {
            data: dataB64,
            filename: "x.txt",
            mimeType: "text/plain",
          },
        },
      }),
      {} as never,
    );
    const body = await res.json();

    expect(uploadPhotoBytes).toHaveBeenCalledOnce();
    const [bytes, filename, mimeType] = vi.mocked(uploadPhotoBytes).mock
      .calls[0];
    expect(Buffer.from(bytes).toString()).toBe(original);
    expect(filename).toBe("x.txt");
    expect(mimeType).toBe("text/plain");
    const parsed = JSON.parse(body.result.content[0].text);
    expect(parsed).toEqual({ key: "test-key" });
  });

  it("get_photo returns image content (not text)", async () => {
    const fakeBytes = Uint8Array.from([1, 2, 3, 4]);
    vi.mocked(getPhoto).mockResolvedValue({
      data: fakeBytes.buffer,
      contentType: "image/png",
    });

    const res = await mcpHandler(
      authedRequest({
        jsonrpc: "2.0",
        id: 9,
        method: "tools/call",
        params: { name: "get_photo", arguments: { key: "some-key" } },
      }),
      {} as never,
    );
    const body = await res.json();

    expect(body.result.content[0].type).toBe("image");
    expect(body.result.content[0].mimeType).toBe("image/png");
    expect(typeof body.result.content[0].data).toBe("string");
    const decoded = Buffer.from(body.result.content[0].data, "base64");
    expect(Array.from(decoded)).toEqual([1, 2, 3, 4]);
  });
});
