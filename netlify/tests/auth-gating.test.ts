import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@netlify/identity", () => ({
  getUser: vi.fn(),
}));

vi.mock("../lib/services/photos", () => ({
  getPhoto: vi.fn(async () => null),
  uploadPhoto: vi.fn(async () => "key"),
}));

import { getUser } from "@netlify/identity";
import houseplants from "../functions/houseplants";
import planters from "../functions/planters";
import notes from "../functions/notes";
import photos from "../functions/photos";
import gardenSeasons from "../functions/garden-seasons";
import gardenCellGroups from "../functions/garden-cell-groups";
import blobCleanup from "../functions/blob-cleanup";

const mockGetUser = vi.mocked(getUser);

const cases: Array<{ name: string; path: string; handler: typeof houseplants }> = [
  { name: "houseplants", path: "/api/houseplants", handler: houseplants },
  { name: "planters", path: "/api/planters", handler: planters },
  { name: "notes", path: "/api/notes", handler: notes },
  { name: "garden-seasons", path: "/api/garden/seasons", handler: gardenSeasons },
  {
    name: "garden-cell-groups",
    path: "/api/garden/cell-groups",
    handler: gardenCellGroups,
  },
  {
    name: "blob-cleanup",
    path: "/api/admin/blob-cleanup",
    handler: blobCleanup,
  },
];

describe("Netlify Function auth gating", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  for (const { name, path, handler } of cases) {
    it(`${name} returns 401 to unauthenticated GET`, async () => {
      mockGetUser.mockResolvedValue(null);
      const res = await handler(
        new Request(`http://localhost${path}`, { method: "GET" }),
        {} as never,
      );
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it(`${name} returns 401 to unauthenticated POST`, async () => {
      mockGetUser.mockResolvedValue(null);
      const res = await handler(
        new Request(`http://localhost${path}`, {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        }),
        {} as never,
      );
      expect(res.status).toBe(401);
    });
  }
});

describe("photos auth gating", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  it("GET /api/photos/:key is public (no auth required)", async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await photos(
      new Request("http://localhost/api/photos/abc", { method: "GET" }),
      {} as never,
    );
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(404);
  });

  it("POST /api/photos/upload returns 401 to unauthenticated POST", async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await photos(
      new Request("http://localhost/api/photos/upload", {
        method: "POST",
        body: new FormData(),
      }),
      {} as never,
    );
    expect(res.status).toBe(401);
  });
});
