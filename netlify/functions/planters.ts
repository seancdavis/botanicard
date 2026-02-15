import type { Context } from "@netlify/functions";
import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "./_shared/db.js";
import { planters, houseplants, notes, photos } from "./_shared/schema.js";

async function generateCardId(db: ReturnType<typeof getDb>): Promise<string> {
  const [result] = await db
    .select({ maxId: sql<string>`MAX(SUBSTRING(card_id FROM 2))` })
    .from(planters);
  const next = result?.maxId ? parseInt(result.maxId, 10) + 1 : 1;
  return `P${String(next).padStart(3, "0")}`;
}

export default async (req: Request, context: Context) => {
  const db = getDb();
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const id = pathParts.length > 2 ? parseInt(pathParts[2], 10) : null;

  if (req.method === "GET" && !id) {
    const rows = await db
      .select()
      .from(planters)
      .orderBy(desc(planters.createdAt));
    return Response.json(rows);
  }

  if (req.method === "GET" && id) {
    const [planter] = await db
      .select()
      .from(planters)
      .where(eq(planters.id, id));
    if (!planter)
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
      });

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

    return Response.json({
      ...planter,
      currentPlants,
      notes: notesWithPhotos,
    });
  }

  if (req.method === "POST") {
    const body = await req.json();
    if (!body.name?.trim()) {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400,
      });
    }

    const cardId = await generateCardId(db);
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
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400,
      });
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

    if (!updated)
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
      });
    return Response.json(updated);
  }

  if (req.method === "DELETE" && id) {
    const [deleted] = await db
      .delete(planters)
      .where(eq(planters.id, id))
      .returning();
    if (!deleted)
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
      });
    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
  });
};

export const config = {
  path: ["/api/planters", "/api/planters/*"],
};
