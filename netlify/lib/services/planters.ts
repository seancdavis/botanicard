import { eq, desc, sql } from "drizzle-orm";
import { db, planters, houseplants, notes, photos } from "../../../db";
import { NotFoundError, ValidationError } from "../errors";

export interface PlanterInput {
  name?: string;
  description?: string | null;
  photoBlobKey?: string | null;
  status?: string;
}

async function generateCardId(): Promise<string> {
  const [result] = await db
    .select({ maxId: sql<string>`MAX(SUBSTRING(card_id FROM 2))` })
    .from(planters);
  const next = result?.maxId ? parseInt(result.maxId, 10) + 1 : 1;
  return `P${String(next).padStart(3, "0")}`;
}

export async function listPlanters() {
  return await db
    .select()
    .from(planters)
    .orderBy(desc(planters.createdAt));
}

export async function getPlanter(id: number) {
  const [planter] = await db
    .select()
    .from(planters)
    .where(eq(planters.id, id));
  if (!planter) throw new NotFoundError();

  const currentPlants = await db
    .select()
    .from(houseplants)
    .where(eq(houseplants.planterId, id));

  const planterNotes = await db
    .select()
    .from(notes)
    .where(
      sql`${notes.entityType} = 'planter' AND ${notes.entityId} = ${id}`,
    )
    .orderBy(desc(notes.createdAt));

  const notesWithPhotos = await Promise.all(
    planterNotes.map(async (note) => {
      const notePhotos = await db
        .select()
        .from(photos)
        .where(eq(photos.noteId, note.id));
      return { ...note, photos: notePhotos };
    }),
  );

  return {
    ...planter,
    currentPlants,
    notes: notesWithPhotos,
  };
}

export async function createPlanter(input: PlanterInput) {
  if (!input.name?.trim()) {
    throw new ValidationError("Name is required");
  }

  const cardId = await generateCardId();
  const [created] = await db
    .insert(planters)
    .values({
      cardId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      photoBlobKey: input.photoBlobKey || null,
      status: input.status || "active",
    })
    .returning();

  return created;
}

export async function updatePlanter(id: number, input: PlanterInput) {
  if (!input.name?.trim()) {
    throw new ValidationError("Name is required");
  }

  const [updated] = await db
    .update(planters)
    .set({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      photoBlobKey: input.photoBlobKey ?? undefined,
      status: input.status || "active",
      updatedAt: new Date(),
    })
    .where(eq(planters.id, id))
    .returning();

  if (!updated) throw new NotFoundError();
  return updated;
}

export async function deletePlanter(id: number) {
  const [deleted] = await db
    .delete(planters)
    .where(eq(planters.id, id))
    .returning();
  if (!deleted) throw new NotFoundError();
}
