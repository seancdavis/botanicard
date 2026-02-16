import type { Config, Context } from "@netlify/functions";
import { eq, desc, sql } from "drizzle-orm";
import { db, gardenCells, gardenSeasons, notes, photos } from "../../db";

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
    .from(gardenCells)
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
  // /api/garden/cells or /api/garden/cells/:id
  const id = pathParts.length > 3 ? parseInt(pathParts[3], 10) : null;

  if (req.method === "GET" && !id) {
    const seasonId = url.searchParams.get("season");
    const selectFields = {
      id: gardenCells.id,
      cardId: gardenCells.cardId,
      seasonId: gardenCells.seasonId,
      plantType: gardenCells.plantType,
      variety: gardenCells.variety,
      seedCount: gardenCells.seedCount,
      status: gardenCells.status,
      description: gardenCells.description,
      createdAt: gardenCells.createdAt,
      updatedAt: gardenCells.updatedAt,
      primaryPhotoBlobKey: sql<string | null>`(
        SELECT p.blob_key FROM photos p
        INNER JOIN notes n ON n.id = p.note_id
        WHERE n.entity_type = 'garden_cell' AND n.entity_id = "garden_cells"."id"
        ORDER BY n.created_at DESC LIMIT 1
      )`,
    };
    const rows = seasonId
      ? await db
          .select(selectFields)
          .from(gardenCells)
          .where(eq(gardenCells.seasonId, parseInt(seasonId, 10)))
          .orderBy(gardenCells.cardId)
      : await db
          .select(selectFields)
          .from(gardenCells)
          .orderBy(gardenCells.cardId);
    return Response.json(rows);
  }

  if (req.method === "GET" && id) {
    const [cell] = await db
      .select()
      .from(gardenCells)
      .where(eq(gardenCells.id, id));
    if (!cell) return Response.json({ error: "Not found" }, { status: 404 });

    // Get season info
    const [season] = await db
      .select()
      .from(gardenSeasons)
      .where(eq(gardenSeasons.id, cell.seasonId));

    const cellNotes = await db
      .select()
      .from(notes)
      .where(
        sql`${notes.entityType} = 'garden_cell' AND ${notes.entityId} = ${id}`
      )
      .orderBy(desc(notes.createdAt));

    const notesWithPhotos = await Promise.all(
      cellNotes.map(async (note) => {
        const notePhotos = await db
          .select()
          .from(photos)
          .where(eq(photos.noteId, note.id));
        return { ...note, photos: notePhotos };
      })
    );

    const primaryPhoto =
      notesWithPhotos.find((n) => n.photos.length > 0)?.photos[0] || null;

    return Response.json({ ...cell, season, primaryPhoto, notes: notesWithPhotos });
  }

  if (req.method === "POST") {
    const body = await req.json();
    if (!body.plantType?.trim() || !body.seasonId) {
      return Response.json(
        { error: "plantType and seasonId are required" },
        { status: 400 }
      );
    }

    // Support batch creation
    const count = body.count || 1;
    const created = [];
    for (let i = 0; i < count; i++) {
      const cardId = await generateCardId(body.seasonId);
      const [cell] = await db
        .insert(gardenCells)
        .values({
          cardId,
          seasonId: body.seasonId,
          plantType: body.plantType.trim(),
          variety: body.variety?.trim() || null,
          seedCount: body.seedCount || null,
          status: body.status || "seeded",
          description: body.description?.trim() || null,
        })
        .returning();
      created.push(cell);
    }

    return Response.json(created.length === 1 ? created[0] : created, {
      status: 201,
    });
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
      .update(gardenCells)
      .set({
        plantType: body.plantType.trim(),
        variety: body.variety?.trim() || null,
        seedCount: body.seedCount || null,
        status: body.status || "seeded",
        description: body.description?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(gardenCells.id, id))
      .returning();

    if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(updated);
  }

  if (req.method === "DELETE" && id) {
    const [deleted] = await db
      .delete(gardenCells)
      .where(eq(gardenCells.id, id))
      .returning();
    if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error("Garden cells API error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
};

export const config: Config = {
  path: ["/api/garden/cells", "/api/garden/cells/*"],
};
