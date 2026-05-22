import { eq, desc, sql } from "drizzle-orm";
import { db, gardenSeasons, gardenCellGroups } from "../../../db";
import { NotFoundError, ValidationError } from "../errors";
import { renderMarkdown } from "../markdown";

export interface GardenSeasonInput {
  name?: string;
  year?: number;
  description?: string | null;
}

export async function listGardenSeasons() {
  const seasons = await db
    .select()
    .from(gardenSeasons)
    .orderBy(desc(gardenSeasons.year), desc(gardenSeasons.createdAt));

  return await Promise.all(
    seasons.map(async (season) => {
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(gardenCellGroups)
        .where(eq(gardenCellGroups.seasonId, season.id));
      return { ...season, groupCount: Number(countResult?.count || 0) };
    }),
  );
}

export async function getGardenSeason(id: number) {
  const [season] = await db
    .select()
    .from(gardenSeasons)
    .where(eq(gardenSeasons.id, id));
  if (!season) throw new NotFoundError();

  const groups = await db
    .select({
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
      createdAt: gardenCellGroups.createdAt,
      updatedAt: gardenCellGroups.updatedAt,
      primaryPhotoBlobKey: sql<string | null>`(
        SELECT p.blob_key FROM photos p
        INNER JOIN notes n ON n.id = p.note_id
        WHERE n.entity_type = 'garden_cell_group' AND n.entity_id = "garden_cell_groups"."id"
        ORDER BY n.created_at DESC LIMIT 1
      )`,
    })
    .from(gardenCellGroups)
    .where(eq(gardenCellGroups.seasonId, id))
    .orderBy(gardenCellGroups.cardId);

  return { ...season, groups };
}

export async function createGardenSeason(input: GardenSeasonInput) {
  if (!input.name?.trim() || !input.year) {
    throw new ValidationError("Name and year are required");
  }

  const description = input.description?.trim() || null;
  const [created] = await db
    .insert(gardenSeasons)
    .values({
      name: input.name.trim(),
      year: input.year,
      description,
      descriptionHtml: renderMarkdown(description),
    })
    .returning();

  return created;
}

export async function updateGardenSeason(id: number, input: GardenSeasonInput) {
  if (!input.name?.trim() || !input.year) {
    throw new ValidationError("Name and year are required");
  }

  const description = input.description?.trim() || null;
  const [updated] = await db
    .update(gardenSeasons)
    .set({
      name: input.name.trim(),
      year: input.year,
      description,
      descriptionHtml: renderMarkdown(description),
    })
    .where(eq(gardenSeasons.id, id))
    .returning();

  if (!updated) throw new NotFoundError();
  return updated;
}

export async function deleteGardenSeason(id: number) {
  const [deleted] = await db
    .delete(gardenSeasons)
    .where(eq(gardenSeasons.id, id))
    .returning();
  if (!deleted) throw new NotFoundError();
}
