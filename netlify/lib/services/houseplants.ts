import { eq, desc, sql } from "drizzle-orm";
import { db, houseplants, planters, notes, photos } from "../../../db";
import { NotFoundError, ValidationError } from "../errors";

export interface HouseplantInput {
  name?: string;
  description?: string | null;
  parentId?: number | null;
  planterId?: number | null;
  status?: string;
}

async function generateCardId(): Promise<string> {
  const [result] = await db
    .select({ maxId: sql<string>`MAX(card_id)` })
    .from(houseplants);
  const next = result?.maxId ? parseInt(result.maxId, 10) + 1 : 1;
  return String(next).padStart(4, "0");
}

export async function listHouseplants() {
  return await db
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
        WHERE n.entity_type = 'houseplant' AND n.entity_id = "houseplants"."id"
        ORDER BY n.created_at DESC LIMIT 1
      )`,
    })
    .from(houseplants)
    .orderBy(desc(houseplants.createdAt));
}

export async function getHouseplant(id: number) {
  const [plant] = await db
    .select()
    .from(houseplants)
    .where(eq(houseplants.id, id));
  if (!plant) throw new NotFoundError();

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
      sql`${notes.entityType} = 'houseplant' AND ${notes.entityId} = ${id}`,
    )
    .orderBy(desc(notes.createdAt));

  const notesWithPhotos = await Promise.all(
    plantNotes.map(async (note) => {
      const notePhotos = await db
        .select()
        .from(photos)
        .where(eq(photos.noteId, note.id));
      return { ...note, photos: notePhotos };
    }),
  );

  const primaryPhoto =
    notesWithPhotos.find((n) => n.photos.length > 0)?.photos[0] || null;

  return {
    ...plant,
    parent,
    children,
    planter,
    primaryPhoto,
    notes: notesWithPhotos,
  };
}

export async function createHouseplant(input: HouseplantInput) {
  if (!input.name?.trim()) {
    throw new ValidationError("Name is required");
  }

  const cardId = await generateCardId();
  const [created] = await db
    .insert(houseplants)
    .values({
      cardId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      parentId: input.parentId || null,
      planterId: input.planterId || null,
      status: input.status || "active",
    })
    .returning();

  return created;
}

export async function updateHouseplant(id: number, input: HouseplantInput) {
  if (input.name !== undefined && !input.name.trim()) {
    throw new ValidationError("Name is required");
  }

  const set: Partial<typeof houseplants.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) set.name = input.name.trim();
  if (input.description !== undefined)
    set.description = input.description?.trim() || null;
  if (input.parentId !== undefined) set.parentId = input.parentId;
  if (input.planterId !== undefined) set.planterId = input.planterId;
  if (input.status !== undefined) set.status = input.status;

  const [updated] = await db
    .update(houseplants)
    .set(set)
    .where(eq(houseplants.id, id))
    .returning();

  if (!updated) throw new NotFoundError();
  return updated;
}

export async function deleteHouseplant(id: number) {
  const [deleted] = await db
    .delete(houseplants)
    .where(eq(houseplants.id, id))
    .returning();
  if (!deleted) throw new NotFoundError();
}
