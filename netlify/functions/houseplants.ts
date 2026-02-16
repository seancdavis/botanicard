import type { Config, Context } from "@netlify/functions";
import { eq, desc, sql } from "drizzle-orm";
import { db, houseplants, planters, notes, photos } from "../../db";

async function generateCardId(): Promise<string> {
  const [result] = await db
    .select({ maxId: sql<string>`MAX(card_id)` })
    .from(houseplants);
  const next = result?.maxId ? parseInt(result.maxId, 10) + 1 : 1;
  return String(next).padStart(4, "0");
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /api/houseplants or /api/houseplants/:id
  const id = pathParts.length > 2 ? parseInt(pathParts[2], 10) : null;

  if (req.method === "GET" && !id) {
    const rows = await db
      .select({
        id: houseplants.id,
        cardId: houseplants.cardId,
        name: houseplants.name,
        description: houseplants.description,
        parentId: houseplants.parentId,
        planterId: houseplants.planterId,
        status: houseplants.status,
        createdAt: houseplants.createdAt,
        updatedAt: houseplants.updatedAt,
        primaryPhotoBlobKey: sql<string | null>`(
          SELECT p.blob_key FROM photos p
          INNER JOIN notes n ON n.id = p.note_id
          WHERE n.entity_type = 'houseplant' AND n.entity_id = ${houseplants.id}
          ORDER BY n.created_at DESC LIMIT 1
        )`,
      })
      .from(houseplants)
      .orderBy(desc(houseplants.createdAt));
    return Response.json(rows);
  }

  if (req.method === "GET" && id) {
    const [plant] = await db
      .select()
      .from(houseplants)
      .where(eq(houseplants.id, id));
    if (!plant) return Response.json({ error: "Not found" }, { status: 404 });

    // Get related data
    const children = await db
      .select()
      .from(houseplants)
      .where(eq(houseplants.parentId, id));

    let parent = null;
    if (plant.parentId) {
      const [p] = await db
        .select()
        .from(houseplants)
        .where(eq(houseplants.id, plant.parentId));
      parent = p || null;
    }

    let planter = null;
    if (plant.planterId) {
      const [pl] = await db
        .select()
        .from(planters)
        .where(eq(planters.id, plant.planterId));
      planter = pl || null;
    }

    const plantNotes = await db
      .select()
      .from(notes)
      .where(
        sql`${notes.entityType} = 'houseplant' AND ${notes.entityId} = ${id}`
      )
      .orderBy(desc(notes.createdAt));

    const notesWithPhotos = await Promise.all(
      plantNotes.map(async (note) => {
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
      ...plant,
      parent,
      children,
      planter,
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
      .insert(houseplants)
      .values({
        cardId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        parentId: body.parentId || null,
        planterId: body.planterId || null,
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
      .update(houseplants)
      .set({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        parentId: body.parentId || null,
        planterId: body.planterId || null,
        status: body.status || "active",
        updatedAt: new Date(),
      })
      .where(eq(houseplants.id, id))
      .returning();

    if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(updated);
  }

  if (req.method === "DELETE" && id) {
    const [deleted] = await db
      .delete(houseplants)
      .where(eq(houseplants.id, id))
      .returning();
    if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: ["/api/houseplants", "/api/houseplants/*"],
};
