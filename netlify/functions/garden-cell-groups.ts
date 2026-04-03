import type { Config, Context } from "@netlify/functions";
import { eq, desc, sql } from "drizzle-orm";
import { db, gardenCellGroups, gardenSeasons, notes, photos } from "../../db";

async function generateCardId(seasonId: number): Promise<string> {
  // Get the season year
  const [season] = await db
    .select()
    .from(gardenSeasons)
    .where(eq(gardenSeasons.id, seasonId));
  const yearPrefix = String(season?.year || new Date().getFullYear()).slice(-2);

  // Find max sequence for this year prefix
  const [result] = await db
    .select({ maxId: sql<string>`MAX(card_id)` })
    .from(gardenCellGroups)
    .where(sql`card_id LIKE ${yearPrefix + "-%"}`);

  let next = 1;
  if (result?.maxId) {
    const parts = result.maxId.split("-");
    next = parseInt(parts[1], 10) + 1;
  }
  return `${yearPrefix}-${String(next).padStart(3, "0")}`;
}

export default async (req: Request, context: Context) => {
  try {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /api/garden/cell-groups or /api/garden/cell-groups/:id
  const id = pathParts.length > 3 ? parseInt(pathParts[3], 10) : null;

  if (req.method === "GET" && !id) {
    const seasonId = url.searchParams.get("season");
    const selectFields = {
      id: gardenCellGroups.id,
      cardId: gardenCellGroups.cardId,
      seasonId: gardenCellGroups.seasonId,
      plantType: gardenCellGroups.plantType,
      variety: gardenCellGroups.variety,
      cellCount: gardenCellGroups.cellCount,
      seedCount: gardenCellGroups.seedCount,
      desiredYield: gardenCellGroups.desiredYield,
      actualYield: gardenCellGroups.actualYield,
      status: gardenCellGroups.status,
      description: gardenCellGroups.description,
      createdAt: gardenCellGroups.createdAt,
      updatedAt: gardenCellGroups.updatedAt,
      primaryPhotoBlobKey: sql<string | null>`(
        SELECT p.blob_key FROM photos p
        INNER JOIN notes n ON n.id = p.note_id
        WHERE n.entity_type = 'garden_cell_group' AND n.entity_id = "garden_cell_groups"."id"
        ORDER BY n.created_at DESC LIMIT 1
      )`,
    };
    const rows = seasonId
      ? await db
          .select(selectFields)
          .from(gardenCellGroups)
          .where(eq(gardenCellGroups.seasonId, parseInt(seasonId, 10)))
          .orderBy(gardenCellGroups.cardId)
      : await db
          .select(selectFields)
          .from(gardenCellGroups)
          .orderBy(gardenCellGroups.cardId);
    return Response.json(rows);
  }

  if (req.method === "GET" && id) {
    const [group] = await db
      .select()
      .from(gardenCellGroups)
      .where(eq(gardenCellGroups.id, id));
    if (!group) return Response.json({ error: "Not found" }, { status: 404 });

    // Get season info
    const [season] = await db
      .select()
      .from(gardenSeasons)
      .where(eq(gardenSeasons.id, group.seasonId));

    const groupNotes = await db
      .select()
      .from(notes)
      .where(
        sql`${notes.entityType} = 'garden_cell_group' AND ${notes.entityId} = ${id}`
      )
      .orderBy(desc(notes.createdAt));

    const notesWithPhotos = await Promise.all(
      groupNotes.map(async (note) => {
        const notePhotos = await db
          .select()
          .from(photos)
          .where(eq(photos.noteId, note.id));
        return { ...note, photos: notePhotos };
      })
    );

    const primaryPhoto =
      notesWithPhotos.find((n) => n.photos.length > 0)?.photos[0] || null;

    return Response.json({ ...group, season, primaryPhoto, notes: notesWithPhotos });
  }

  if (req.method === "POST") {
    const body = await req.json();
    if (!body.plantType?.trim() || !body.seasonId) {
      return Response.json(
        { error: "plantType and seasonId are required" },
        { status: 400 }
      );
    }

    const cardId = await generateCardId(body.seasonId);
    const [group] = await db
      .insert(gardenCellGroups)
      .values({
        cardId,
        seasonId: body.seasonId,
        plantType: body.plantType.trim(),
        variety: body.variety?.trim() || null,
        cellCount: body.cellCount || 1,
        seedCount: body.seedCount || null,
        desiredYield: body.desiredYield || null,
        status: body.status || "seeded",
        description: body.description?.trim() || null,
      })
      .returning();

    return Response.json(group, { status: 201 });
  }

  if (req.method === "PUT" && id) {
    const body = await req.json();
    if (!body.plantType?.trim()) {
      return Response.json(
        { error: "plantType is required" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(gardenCellGroups)
      .set({
        plantType: body.plantType.trim(),
        variety: body.variety?.trim() || null,
        cellCount: body.cellCount || 1,
        seedCount: body.seedCount || null,
        desiredYield: body.desiredYield || null,
        actualYield: body.actualYield || null,
        status: body.status || "seeded",
        description: body.description?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(gardenCellGroups.id, id))
      .returning();

    if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(updated);
  }

  if (req.method === "DELETE" && id) {
    const [deleted] = await db
      .delete(gardenCellGroups)
      .where(eq(gardenCellGroups.id, id))
      .returning();
    if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error("Garden cell groups API error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
};

export const config: Config = {
  path: ["/api/garden/cell-groups", "/api/garden/cell-groups/*"],
};
