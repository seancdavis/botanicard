import type { Context } from "@netlify/functions";
import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "./_shared/db.js";
import {
  gardenCells,
  gardenSeasons,
  notes,
  photos,
} from "./_shared/schema.js";

async function generateCardId(
  db: ReturnType<typeof getDb>,
  seasonId: number
): Promise<string> {
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
  const db = getDb();
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /api/garden/cells or /api/garden/cells/:id
  const id = pathParts.length > 3 ? parseInt(pathParts[3], 10) : null;

  if (req.method === "GET" && !id) {
    const seasonId = url.searchParams.get("season");
    let query = db.select().from(gardenCells);
    if (seasonId) {
      query = query.where(
        eq(gardenCells.seasonId, parseInt(seasonId, 10))
      ) as typeof query;
    }
    const rows = await query.orderBy(gardenCells.cardId);
    return Response.json(rows);
  }

  if (req.method === "GET" && id) {
    const [cell] = await db
      .select()
      .from(gardenCells)
      .where(eq(gardenCells.id, id));
    if (!cell)
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

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

    return Response.json({ ...cell, season, notes: notesWithPhotos });
  }

  if (req.method === "POST") {
    const body = await req.json();
    if (!body.plantType?.trim() || !body.seasonId) {
      return new Response(
        JSON.stringify({ error: "plantType and seasonId are required" }),
        { status: 400 }
      );
    }

    // Support batch creation
    const count = body.count || 1;
    const created = [];
    for (let i = 0; i < count; i++) {
      const cardId = await generateCardId(db, body.seasonId);
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
      return new Response(
        JSON.stringify({ error: "plantType is required" }),
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

    if (!updated)
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    return Response.json(updated);
  }

  if (req.method === "DELETE" && id) {
    const [deleted] = await db
      .delete(gardenCells)
      .where(eq(gardenCells.id, id))
      .returning();
    if (!deleted)
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
  });
};

export const config = {
  path: ["/api/garden/cells", "/api/garden/cells/*"],
};
