import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@netlify/identity", () => ({
  getUser: vi.fn(),
}));

import { getUser } from "@netlify/identity";
import { requireAuth } from "./auth";

const mockGetUser = vi.mocked(getUser);

describe("requireAuth", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  it("returns 401 when no user is present", async () => {
    mockGetUser.mockResolvedValue(null);
    const inner = vi.fn();
    const handler = requireAuth(inner);

    const res = await handler(
      new Request("http://localhost/api/foo"),
      {} as never,
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(inner).not.toHaveBeenCalled();
  });

  it("invokes the inner handler when a user is present", async () => {
    mockGetUser.mockResolvedValue({ id: "u1", email: "me@example.com" });
    const inner = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: true }));
    const handler = requireAuth(inner);

    const req = new Request("http://localhost/api/foo");
    const ctx = {} as never;
    const res = await handler(req, ctx);

    expect(inner).toHaveBeenCalledWith(req, ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("propagates the inner handler's response status", async () => {
    mockGetUser.mockResolvedValue({ id: "u1" });
    const inner = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const handler = requireAuth(inner);

    const res = await handler(
      new Request("http://localhost/api/foo"),
      {} as never,
    );

    expect(res.status).toBe(204);
  });
});
