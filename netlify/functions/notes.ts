import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db, notes, photos } from "../../db";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const id = pathParts.length > 2 ? parseInt(pathParts[2], 10) : null;

  if (req.method === "POST") {
    const body = await req.json();
    if (!body.entityType || !body.entityId) {
      return Response.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    const [note] = await db
      .insert(notes)
      .values({
        entityType: body.entityType,
        entityId: body.entityId,
        content: body.content || null,
        ...(body.observedAt ? { observedAt: new Date(body.observedAt) } : {}),
        ...(body.createdAt ? { createdAt: new Date(body.createdAt) } : {}),
      })
      .returning();

    // Attach photos if provided
    if (body.photoKeys && Array.isArray(body.photoKeys)) {
      for (const key of body.photoKeys) {
        await db.insert(photos).values({
          noteId: note.id,
          blobKey: key,
          filename: key,
        });
      }
    }

    return Response.json(note, { status: 201 });
  }

  if (req.method === "PUT" && id) {
    try {
      const body = await req.json();
      const [updated] = await db
        .update(notes)
        .set({
          content: body.content,
          ...(body.observedAt !== undefined
            ? { observedAt: body.observedAt ? new Date(body.observedAt) : null }
            : {}),
        })
        .where(eq(notes.id, id))
        .returning();
      if (!updated)
        return Response.json({ error: "Not found" }, { status: 404 });

      // Remove photos if requested
      if (body.removePhotoIds && Array.isArray(body.removePhotoIds)) {
        for (const photoId of body.removePhotoIds) {
          await db.delete(photos).where(eq(photos.id, photoId));
        }
      }

      // Add new photos if provided
      if (body.photoKeys && Array.isArray(body.photoKeys)) {
        for (const key of body.photoKeys) {
          await db.insert(photos).values({
            noteId: id,
            blobKey: key,
            filename: key,
          });
        }
      }

      return Response.json(updated);
    } catch (err) {
      console.error("Error updating note:", err);
      return Response.json({ error: "Failed to update note" }, { status: 500 });
    }
  }

  if (req.method === "DELETE" && id) {
    // Delete associated photos first
    await db.delete(photos).where(eq(photos.noteId, id));
    const [deleted] = await db.delete(notes).where(eq(notes.id, id)).returning();
    if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: ["/api/notes", "/api/notes/*"],
};
