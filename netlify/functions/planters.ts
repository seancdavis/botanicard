import type { Config, Context } from "@netlify/functions";
import { eq, desc, sql } from "drizzle-orm";
import { db, planters, houseplants, notes, photos } from "../../db";

async function generateCardId(): Promise<string> {
  const [result] = await db
    .select({ maxId: sql<string>`MAX(SUBSTRING(card_id FROM 2))` })
    .from(planters);
  const next = result?.maxId ? parseInt(result.maxId, 10) + 1 : 1;
  return `P${String(next).padStart(3, "0")}`;
}

export default async (req: Request, context: Context) => {
  try {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const id = pathParts.length > 2 ? parseInt(pathParts[2], 10) : null;

  if (req.method === "GET" && !id) {
    const rows = await db
      .select({
        id: planters.id,
        cardId: planters.cardId,
        name: planters.name,
        description: planters.description,
        status: planters.status,
        createdAt: planters.createdAt,
        updatedAt: planters.updatedAt,
        primaryPhotoBlobKey: sql<string | null>`(
          SELECT p.blob_key FROM photos p
          INNER JOIN notes n ON n.id = p.note_id
          WHERE n.entity_type = 'planter' AND n.entity_id = "planters"."id"
          ORDER BY n.created_at DESC LIMIT 1
        )`,
      })
      .from(planters)
      .orderBy(desc(planters.createdAt));
    return Response.json(rows);
  }

  if (req.method === "GET" && id) {
    const [planter] = await db
      .select()
      .from(planters)
      .where(eq(planters.id, id));
    if (!planter) return Response.json({ error: "Not found" }, { status: 404 });

    // Find current plant in this planter
    const currentPlants = await db
      .select()
      .from(houseplants)
      .where(eq(houseplants.planterId, id));

    const planterNotes = await db
      .select()
      .from(notes)
      .where(
        sql`${notes.entityType} = 'planter' AND ${notes.entityId} = ${id}`
      )
      .orderBy(desc(notes.createdAt));

    const notesWithPhotos = await Promise.all(
      planterNotes.map(async (note) => {
        const notePhotos = await db
          .select()
          .from(photos)
          .where(eq(photos.noteId, note.id));
        return { ...note, photos: notePhotos };
      })
    );

    const primaryPhoto =
      notesWithPhotos.find((n) => n.photos.length > 0)?.photos[0] || null;

    return Response.json({
      ...planter,
      currentPlants,
      primaryPhoto,
      notes: notesWithPhotos,
    });
  }

  if (req.method === "POST") {
    const body = await req.json();
    if (!body.name?.trim()) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const cardId = await generateCardId();
    const [created] = await db
      .insert(planters)
      .values({
        cardId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        status: body.status || "active",
      })
      .returning();

    return Response.json(created, { status: 201 });
  }

  if (req.method === "PUT" && id) {
    const body = await req.json();
    if (!body.name?.trim()) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(planters)
      .set({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        status: body.status || "active",
        updatedAt: new Date(),
      })
      .where(eq(planters.id, id))
      .returning();

    if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(updated);
  }

  if (req.method === "DELETE" && id) {
    const [deleted] = await db
      .delete(planters)
      .where(eq(planters.id, id))
      .returning();
    if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error("Planters API error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
};

export const config: Config = {
  path: ["/api/planters", "/api/planters/*"],
};
