import { eq } from "drizzle-orm";
import { db, notes, photos } from "../../../db";
import { NotFoundError, ValidationError } from "../errors";
import { renderMarkdown } from "../markdown";

export interface CreateNoteInput {
  entityType?: string;
  entityId?: number;
  content?: string | null;
  observedAt?: string | null;
  createdAt?: string | null;
  photoKeys?: string[];
}

export interface UpdateNoteInput {
  content?: string | null;
  observedAt?: string | null;
  photoKeys?: string[];
  removePhotoIds?: number[];
}

export async function createNote(input: CreateNoteInput) {
  if (!input.entityType || !input.entityId) {
    throw new ValidationError("entityType and entityId are required");
  }

  const content = input.content || null;
  const [note] = await db
    .insert(notes)
    .values({
      entityType: input.entityType,
      entityId: input.entityId,
      content,
      contentHtml: renderMarkdown(content),
      ...(input.observedAt ? { observedAt: new Date(input.observedAt) } : {}),
      ...(input.createdAt ? { createdAt: new Date(input.createdAt) } : {}),
    })
    .returning();

  if (input.photoKeys && Array.isArray(input.photoKeys)) {
    for (const key of input.photoKeys) {
      await db.insert(photos).values({
        noteId: note.id,
        blobKey: key,
        filename: key,
      });
    }
  }

  return note;
}

export async function updateNote(id: number, input: UpdateNoteInput) {
  const [updated] = await db
    .update(notes)
    .set({
      content: input.content,
      contentHtml: renderMarkdown(input.content),
      ...(input.observedAt !== undefined
        ? { observedAt: input.observedAt ? new Date(input.observedAt) : null }
        : {}),
    })
    .where(eq(notes.id, id))
    .returning();
  if (!updated) throw new NotFoundError();

  if (input.removePhotoIds && Array.isArray(input.removePhotoIds)) {
    for (const photoId of input.removePhotoIds) {
      await db.delete(photos).where(eq(photos.id, photoId));
    }
  }

  if (input.photoKeys && Array.isArray(input.photoKeys)) {
    for (const key of input.photoKeys) {
      await db.insert(photos).values({
        noteId: id,
        blobKey: key,
        filename: key,
      });
    }
  }

  return updated;
}

export async function deleteNote(id: number) {
  await db.delete(photos).where(eq(photos.noteId, id));
  const [deleted] = await db
    .delete(notes)
    .where(eq(notes.id, id))
    .returning();
  if (!deleted) throw new NotFoundError();
}
