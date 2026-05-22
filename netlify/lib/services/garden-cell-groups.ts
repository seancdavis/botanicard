import { eq, desc, sql } from "drizzle-orm";
import {
  db,
  gardenCellGroups,
  gardenSeasons,
  notes,
  photos,
} from "../../../db";
import { NotFoundError, ValidationError } from "../errors";
import { renderMarkdown } from "../markdown";

export interface CreateCellGroupInput {
  seasonId?: number;
  plantType?: string;
  variety?: string | null;
  cellCount?: number;
  seedCount?: number | null;
  desiredYield?: number | null;
  status?: string;
  description?: string | null;
}

export interface UpdateCellGroupInput {
  plantType?: string;
  variety?: string | null;
  cellCount?: number;
  seedCount?: number | null;
  desiredYield?: number | null;
  actualYield?: number | null;
  status?: string;
  description?: string | null;
}

async function generateCardId(seasonId: number): Promise<string> {
  const [season] = await db
    .select()
    .from(gardenSeasons)
    .where(eq(gardenSeasons.id, seasonId));
  const yearPrefix = String(season?.year || new Date().getFullYear()).slice(-2);

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

const listSelectFields = {
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
  descriptionHtml: gardenCellGroups.descriptionHtml,
  createdAt: gardenCellGroups.createdAt,
  updatedAt: gardenCellGroups.updatedAt,
  primaryPhotoBlobKey: sql<string | null>`(
    SELECT p.blob_key FROM photos p
    INNER JOIN notes n ON n.id = p.note_id
    WHERE n.entity_type = 'garden_cell_group' AND n.entity_id = "garden_cell_groups"."id"
    ORDER BY n.created_at DESC LIMIT 1
  )`,
};

export async function listCellGroups(seasonId?: number) {
  if (seasonId !== undefined) {
    return await db
      .select(listSelectFields)
      .from(gardenCellGroups)
      .where(eq(gardenCellGroups.seasonId, seasonId))
      .orderBy(gardenCellGroups.cardId);
  }
  return await db
    .select(listSelectFields)
    .from(gardenCellGroups)
    .orderBy(gardenCellGroups.cardId);
}

export async function getCellGroup(id: number) {
  const [group] = await db
    .select()
    .from(gardenCellGroups)
    .where(eq(gardenCellGroups.id, id));
  if (!group) throw new NotFoundError();

  const [season] = await db
    .select()
    .from(gardenSeasons)
    .where(eq(gardenSeasons.id, group.seasonId));

  const groupNotes = await db
    .select()
    .from(notes)
    .where(
      sql`${notes.entityType} = 'garden_cell_group' AND ${notes.entityId} = ${id}`,
    )
    .orderBy(desc(notes.createdAt));

  const notesWithPhotos = await Promise.all(
    groupNotes.map(async (note) => {
      const notePhotos = await db
        .select()
        .from(photos)
        .where(eq(photos.noteId, note.id));
      return { ...note, photos: notePhotos };
    }),
  );

  const primaryPhoto =
    notesWithPhotos.find((n) => n.photos.length > 0)?.photos[0] || null;

  return { ...group, season, primaryPhoto, notes: notesWithPhotos };
}

export async function createCellGroup(input: CreateCellGroupInput) {
  if (!input.plantType?.trim() || !input.seasonId) {
    throw new ValidationError("plantType and seasonId are required");
  }

  const cardId = await generateCardId(input.seasonId);
  const description = input.description?.trim() || null;
  const [group] = await db
    .insert(gardenCellGroups)
    .values({
      cardId,
      seasonId: input.seasonId,
      plantType: input.plantType.trim(),
      variety: input.variety?.trim() || null,
      cellCount: input.cellCount || 1,
      seedCount: input.seedCount || null,
      desiredYield: input.desiredYield || null,
      status: input.status || "seeded",
      description,
      descriptionHtml: renderMarkdown(description),
    })
    .returning();

  return group;
}

export async function updateCellGroup(id: number, input: UpdateCellGroupInput) {
  if (!input.plantType?.trim()) {
    throw new ValidationError("plantType is required");
  }

  const description = input.description?.trim() || null;
  const [updated] = await db
    .update(gardenCellGroups)
    .set({
      plantType: input.plantType.trim(),
      variety: input.variety?.trim() || null,
      cellCount: input.cellCount || 1,
      seedCount: input.seedCount || null,
      desiredYield: input.desiredYield || null,
      actualYield: input.actualYield || null,
      status: input.status || "seeded",
      description,
      descriptionHtml: renderMarkdown(description),
      updatedAt: new Date(),
    })
    .where(eq(gardenCellGroups.id, id))
    .returning();

  if (!updated) throw new NotFoundError();
  return updated;
}

export async function deleteCellGroup(id: number) {
  const [deleted] = await db
    .delete(gardenCellGroups)
    .where(eq(gardenCellGroups.id, id))
    .returning();
  if (!deleted) throw new NotFoundError();
}
