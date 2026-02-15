import type { Context } from "@netlify/functions";
import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "./_shared/db.js";
import { gardenSeasons, gardenCells } from "./_shared/schema.js";

export default async (req: Request, context: Context) => {
  const db = getDb();
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /api/garden/seasons or /api/garden/seasons/:id
  const id = pathParts.length > 3 ? parseInt(pathParts[3], 10) : null;

  if (req.method === "GET" && !id) {
    const seasons = await db
      .select()
      .from(gardenSeasons)
      .orderBy(desc(gardenSeasons.year), desc(gardenSeasons.createdAt));

    // Attach cell counts
    const withCounts = await Promise.all(
      seasons.map(async (season) => {
        const [countResult] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(gardenCells)
          .where(eq(gardenCells.seasonId, season.id));
        return { ...season, cellCount: Number(countResult?.count || 0) };
      })
    );

    return Response.json(withCounts);
  }

  if (req.method === "GET" && id) {
    const [season] = await db
      .select()
      .from(gardenSeasons)
      .where(eq(gardenSeasons.id, id));
    if (!season)
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

    const cells = await db
      .select()
      .from(gardenCells)
      .where(eq(gardenCells.seasonId, id))
      .orderBy(gardenCells.cardId);

    return Response.json({ ...season, cells });
  }

  if (req.method === "POST") {
    const body = await req.json();
    if (!body.name?.trim() || !body.year) {
      return new Response(
        JSON.stringify({ error: "Name and year are required" }),
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(gardenSeasons)
      .values({
        name: body.name.trim(),
        year: body.year,
        description: body.description?.trim() || null,
      })
      .returning();

    return Response.json(created, { status: 201 });
  }

  if (req.method === "PUT" && id) {
    const body = await req.json();
    if (!body.name?.trim() || !body.year) {
      return new Response(
        JSON.stringify({ error: "Name and year are required" }),
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(gardenSeasons)
      .set({
        name: body.name.trim(),
        year: body.year,
        description: body.description?.trim() || null,
      })
      .where(eq(gardenSeasons.id, id))
      .returning();

    if (!updated)
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    return Response.json(updated);
  }

  if (req.method === "DELETE" && id) {
    const [deleted] = await db
      .delete(gardenSeasons)
      .where(eq(gardenSeasons.id, id))
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
  path: ["/api/garden/seasons", "/api/garden/seasons/*"],
};
