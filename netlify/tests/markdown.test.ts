import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// renderMarkdown — pure unit tests (no mocking needed)
// ---------------------------------------------------------------------------

import { renderMarkdown } from "../lib/markdown";

describe("renderMarkdown", () => {
  it("strips <script> tags from the sanitized output", () => {
    const result = renderMarkdown(
      'Hello <script>alert("xss")</script> world',
    );
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert(");
  });

  it("returns null for null input", () => {
    expect(renderMarkdown(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(renderMarkdown(undefined)).toBeNull();
  });

  it("returns null for empty/whitespace-only string", () => {
    expect(renderMarkdown("")).toBeNull();
    expect(renderMarkdown("   ")).toBeNull();
  });

  it("converts markdown to sanitized HTML", () => {
    const result = renderMarkdown("**bold**");
    expect(result).toContain("<strong>bold</strong>");
  });
});

// ---------------------------------------------------------------------------
// Service tests — verify _html columns are populated alongside markdown fields
//
// Paths in vi.mock() are resolved relative to THIS test file:
//   netlify/tests/markdown.test.ts
// So "../../db" reaches the root db/ package (same as the services' "../../../db").
// ---------------------------------------------------------------------------

vi.mock("../../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  houseplants: {},
  planters: {},
  gardenSeasons: {},
  gardenCellGroups: {},
  notes: {},
  photos: {},
}));

import { db } from "../../db";

// Build a chainable select stub for generateCardId (used inside createHouseplant)
function makeSelectStub(rows: unknown[]) {
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn().mockResolvedValue(rows),
  });
}

// Build a chainable insert stub; returns the `values` spy for assertion
function makeInsertStub(returnRow: Record<string, unknown>) {
  const returning = vi.fn().mockResolvedValue([returnRow]);
  const values = vi.fn().mockReturnValue({ returning });
  (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values });
  return { values, returning };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createHouseplant service — description_html column", () => {
  it("inserts both description and descriptionHtml", async () => {
    // generateCardId queries db.select({maxId: ...}).from(houseplants)
    makeSelectStub([{ maxId: "0001" }]);

    const { values } = makeInsertStub({
      id: 1,
      name: "Basil",
      description: "**fresh**",
      descriptionHtml: "<p><strong>fresh</strong></p>",
    });

    // Dynamic import so the mock is applied before the module initialises
    const { createHouseplant } = await import("../lib/services/houseplants");
    await createHouseplant({ name: "Basil", description: "**fresh**" });

    const inserted = values.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.description).toBe("**fresh**");
    // descriptionHtml must be a non-null string containing HTML bold markup
    expect(typeof inserted.descriptionHtml).toBe("string");
    expect(inserted.descriptionHtml as string).toContain("<strong>");
  });
});

describe("createNote service — content_html column", () => {
  it("inserts both content and contentHtml", async () => {
    const { values } = makeInsertStub({
      id: 1,
      entityType: "houseplant",
      entityId: 42,
      content: "_italic_",
      contentHtml: "<p><em>italic</em></p>",
    });

    const { createNote } = await import("../lib/services/notes");
    await createNote({
      entityType: "houseplant",
      entityId: 42,
      content: "_italic_",
    });

    const inserted = values.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.content).toBe("_italic_");
    // contentHtml must be a non-null string containing HTML italic markup
    expect(typeof inserted.contentHtml).toBe("string");
    expect(inserted.contentHtml as string).toContain("<em>");
  });
});
