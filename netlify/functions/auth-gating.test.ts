import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@netlify/identity", () => ({
  getUser: vi.fn(),
}));

import { getUser } from "@netlify/identity";
import houseplants from "./houseplants";
import planters from "./planters";
import notes from "./notes";
import photos from "./photos";
import gardenSeasons from "./garden-seasons";
import gardenCellGroups from "./garden-cell-groups";
import blobCleanup from "./blob-cleanup";

const mockGetUser = vi.mocked(getUser);

const cases: Array<{ name: string; path: string; handler: typeof houseplants }> = [
  { name: "houseplants", path: "/api/houseplants", handler: houseplants },
  { name: "planters", path: "/api/planters", handler: planters },
  { name: "notes", path: "/api/notes", handler: notes },
  { name: "photos", path: "/api/photos/abc", handler: photos },
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
