import type { Config, Context } from "@netlify/functions";
import { eq, sql, desc } from "drizzle-orm";
import { db, gardenCells, gardenSeasons, notes } from "../../db";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const action = pathParts[3]; // "process" or "confirm"

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // POST /api/garden/import/process
  if (action === "process") {
    const body = await req.json();
    const { seasonId, transcription } = body;

    if (!seasonId || !transcription?.trim()) {
      return Response.json(
        { error: "seasonId and transcription are required" },
        { status: 400 }
      );
    }

    // Get season and its cells
    const [season] = await db
      .select()
      .from(gardenSeasons)
      .where(eq(gardenSeasons.id, seasonId));

    if (!season) {
      return Response.json({ error: "Season not found" }, { status: 404 });
    }

    const cells = await db
      .select()
      .from(gardenCells)
      .where(eq(gardenCells.seasonId, seasonId))
      .orderBy(gardenCells.cardId);

    const cellInfo = cells
      .map(
        (c) =>
          `${c.cardId}: ${c.plantType}${c.variety ? ` (${c.variety})` : ""} — status: ${c.status}`
      )
      .join("\n");

    // Use AI Gateway to process the transcription
    const baseUrl =
      process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
    const aiResponse = await fetch(
      `${baseUrl}/v1/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 4096,
          system: `You are a garden tracking assistant. Given a transcription of garden notes and a list of existing garden cells, parse the transcription into structured updates.

Current season: ${season.name} (${season.year})

Existing cells:
${cellInfo || "(no cells yet)"}

**IMPORTANT: Return ONLY raw JSON. DO NOT wrap it in markdown code fences (\`\`\`). No prose, no explanation — just the JSON object.**

Return valid JSON matching this schema:
{
  "updates": [
    {
      "cardId": "string (existing cell card_id, or null for general notes)",
      "plantType": "string (the plant name)",
      "statusChange": "string or null (new status: seeded, sprouting, growing, transplanted, producing, harvested, dead)",
      "note": "string (observation or update text)"
    }
  ]
}

Match plant references to existing cells by card_id or plant type. If the transcription mentions a plant not in the current cells, set cardId to null. Be concise in the note text — capture the essential observation.`,
          messages: [
            {
              role: "user",
              content: transcription,
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      return Response.json({ error: "AI processing failed" }, { status: 500 });
    }

    const aiData = await aiResponse.json();
    const responseText = (aiData.content?.[0]?.text || "")
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      return Response.json(
        { error: "Failed to parse AI response", raw: responseText },
        { status: 500 }
      );
    }

    return Response.json({
      season: { id: season.id, name: season.name },
      cells: cells.map((c) => ({
        id: c.id,
        cardId: c.cardId,
        plantType: c.plantType,
        variety: c.variety,
        status: c.status,
      })),
      updates: parsed.updates || [],
    });
  }

  // POST /api/garden/import/confirm
  if (action === "confirm") {
    const body = await req.json();
    const { updates, observationDate } = body;

    if (!updates || !Array.isArray(updates)) {
      return Response.json(
        { error: "updates array is required" },
        { status: 400 }
      );
    }

    let notesCreated = 0;
    let statusUpdates = 0;

    for (const update of updates) {
      if (!update.cardId) continue;

      // Find the cell
      const [cell] = await db
        .select()
        .from(gardenCells)
        .where(eq(gardenCells.cardId, update.cardId));

      if (!cell) continue;

      // Update status if changed
      if (update.statusChange && update.statusChange !== cell.status) {
        await db
          .update(gardenCells)
          .set({ status: update.statusChange, updatedAt: new Date() })
          .where(eq(gardenCells.id, cell.id));
        statusUpdates++;
      }

      // Create note if text provided
      if (update.note?.trim()) {
        await db.insert(notes).values({
          entityType: "garden_cell",
          entityId: cell.id,
          content: update.note.trim(),
          ...(observationDate
            ? { createdAt: new Date(observationDate) }
            : {}),
        });
        notesCreated++;
      }
    }

    return Response.json({
      success: true,
      notesCreated,
      statusUpdates,
    });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
};

export const config: Config = {
  path: "/api/garden/import/*",
};
