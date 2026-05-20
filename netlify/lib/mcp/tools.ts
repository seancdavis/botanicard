import { NotFoundError, ValidationError } from "../errors";
import {
  createHouseplant,
  getHouseplant,
  listHouseplants,
  updateHouseplant,
} from "../services/houseplants";
import {
  createPlanter,
  getPlanter,
  listPlanters,
  updatePlanter,
} from "../services/planters";
import {
  createCellGroup,
  getCellGroup,
  listCellGroups,
  updateCellGroup,
} from "../services/garden-cell-groups";
import { createNote, updateNote } from "../services/notes";
import { getPhoto, uploadPhotoBytes } from "../services/photos";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

const requireString = (args: Record<string, unknown>, key: string): string => {
  const v = args[key];
  if (typeof v !== "string" || v.length === 0) {
    throw new ValidationError(`${key} is required`);
  }
  return v;
};

const requireNumber = (args: Record<string, unknown>, key: string): number => {
  const v = args[key];
  if (typeof v !== "number" || Number.isNaN(v)) {
    throw new ValidationError(`${key} is required`);
  }
  return v;
};

const optionalString = (
  args: Record<string, unknown>,
  key: string,
): string | undefined => {
  const v = args[key];
  return typeof v === "string" ? v : undefined;
};

const optionalNumber = (
  args: Record<string, unknown>,
  key: string,
): number | undefined => {
  const v = args[key];
  return typeof v === "number" ? v : undefined;
};

export const tools: ToolDefinition[] = [
  // ── Houseplants ────────────────────────────────────────────────────────
  {
    name: "list_houseplants",
    description:
      "List all houseplants with summary fields and the primary photo blob key for each.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => listHouseplants(),
  },
  {
    name: "get_houseplant",
    description:
      "Get a single houseplant by its database id, including parent, children, planter, and recent notes with photos.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"],
    },
    handler: async (args) => getHouseplant(requireNumber(args, "id")),
  },
  {
    name: "create_houseplant",
    description:
      "Create a new houseplant. Status defaults to 'active'. parentId and planterId are optional foreign keys.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        parentId: { type: "number" },
        planterId: { type: "number" },
        status: {
          type: "string",
          enum: ["active", "archived", "dead", "given_away", "sold"],
        },
      },
      required: ["name"],
    },
    handler: async (args) =>
      createHouseplant({
        name: requireString(args, "name"),
        description: optionalString(args, "description") ?? null,
        parentId: optionalNumber(args, "parentId") ?? null,
        planterId: optionalNumber(args, "planterId") ?? null,
        status: optionalString(args, "status"),
      }),
  },
  {
    name: "update_houseplant",
    description:
      "Update an existing houseplant by id. Provide name plus any other fields to change.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        name: { type: "string" },
        description: { type: "string" },
        parentId: { type: "number" },
        planterId: { type: "number" },
        status: {
          type: "string",
          enum: ["active", "archived", "dead", "given_away", "sold"],
        },
      },
      required: ["id", "name"],
    },
    handler: async (args) =>
      updateHouseplant(requireNumber(args, "id"), {
        name: requireString(args, "name"),
        description: optionalString(args, "description") ?? null,
        parentId: optionalNumber(args, "parentId") ?? null,
        planterId: optionalNumber(args, "planterId") ?? null,
        status: optionalString(args, "status"),
      }),
  },

  // ── Planters ───────────────────────────────────────────────────────────
  {
    name: "list_planters",
    description: "List all planters.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => listPlanters(),
  },
  {
    name: "get_planter",
    description:
      "Get a single planter by id with its current plants and recent notes.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"],
    },
    handler: async (args) => getPlanter(requireNumber(args, "id")),
  },
  {
    name: "create_planter",
    description: "Create a new planter. Status defaults to 'active'.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        photoBlobKey: { type: "string" },
        status: {
          type: "string",
          enum: ["active", "archived", "broken", "given_away", "sold"],
        },
      },
      required: ["name"],
    },
    handler: async (args) =>
      createPlanter({
        name: requireString(args, "name"),
        description: optionalString(args, "description") ?? null,
        photoBlobKey: optionalString(args, "photoBlobKey") ?? null,
        status: optionalString(args, "status"),
      }),
  },
  {
    name: "update_planter",
    description: "Update an existing planter by id.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        name: { type: "string" },
        description: { type: "string" },
        photoBlobKey: { type: "string" },
        status: {
          type: "string",
          enum: ["active", "archived", "broken", "given_away", "sold"],
        },
      },
      required: ["id", "name"],
    },
    handler: async (args) =>
      updatePlanter(requireNumber(args, "id"), {
        name: requireString(args, "name"),
        description: optionalString(args, "description") ?? null,
        photoBlobKey: optionalString(args, "photoBlobKey") ?? null,
        status: optionalString(args, "status"),
      }),
  },

  // ── Garden cell groups ─────────────────────────────────────────────────
  {
    name: "list_garden_cell_groups",
    description:
      "List garden cell groups. Optionally filter by seasonId. Each row includes the primary photo blob key.",
    inputSchema: {
      type: "object",
      properties: { seasonId: { type: "number" } },
      required: [],
    },
    handler: async (args) => listCellGroups(optionalNumber(args, "seasonId")),
  },
  {
    name: "get_garden_cell_group",
    description:
      "Get a single garden cell group by id, with its season and recent notes.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"],
    },
    handler: async (args) => getCellGroup(requireNumber(args, "id")),
  },
  {
    name: "create_garden_cell_group",
    description:
      "Create a new garden cell group within a season. Status defaults to 'seeded'. cellCount defaults to 1.",
    inputSchema: {
      type: "object",
      properties: {
        seasonId: { type: "number" },
        plantType: { type: "string" },
        variety: { type: "string" },
        cellCount: { type: "number" },
        seedCount: { type: "number" },
        desiredYield: { type: "number" },
        status: {
          type: "string",
          enum: [
            "seeded",
            "sprouting",
            "growing",
            "transplanted",
            "producing",
            "harvested",
            "dead",
          ],
        },
        description: { type: "string" },
      },
      required: ["seasonId", "plantType"],
    },
    handler: async (args) =>
      createCellGroup({
        seasonId: requireNumber(args, "seasonId"),
        plantType: requireString(args, "plantType"),
        variety: optionalString(args, "variety") ?? null,
        cellCount: optionalNumber(args, "cellCount"),
        seedCount: optionalNumber(args, "seedCount") ?? null,
        desiredYield: optionalNumber(args, "desiredYield") ?? null,
        status: optionalString(args, "status"),
        description: optionalString(args, "description") ?? null,
      }),
  },
  {
    name: "update_garden_cell_group",
    description: "Update a garden cell group by id.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        plantType: { type: "string" },
        variety: { type: "string" },
        cellCount: { type: "number" },
        seedCount: { type: "number" },
        desiredYield: { type: "number" },
        actualYield: { type: "number" },
        status: {
          type: "string",
          enum: [
            "seeded",
            "sprouting",
            "growing",
            "transplanted",
            "producing",
            "harvested",
            "dead",
          ],
        },
        description: { type: "string" },
      },
      required: ["id", "plantType"],
    },
    handler: async (args) =>
      updateCellGroup(requireNumber(args, "id"), {
        plantType: requireString(args, "plantType"),
        variety: optionalString(args, "variety") ?? null,
        cellCount: optionalNumber(args, "cellCount"),
        seedCount: optionalNumber(args, "seedCount") ?? null,
        desiredYield: optionalNumber(args, "desiredYield") ?? null,
        actualYield: optionalNumber(args, "actualYield") ?? null,
        status: optionalString(args, "status"),
        description: optionalString(args, "description") ?? null,
      }),
  },

  // ── Notes ──────────────────────────────────────────────────────────────
  {
    name: "create_note",
    description:
      "Attach a note to a houseplant, planter, or garden_cell_group. Provide entityType + entityId. Optionally attach previously-uploaded photos via photoKeys (use upload_photo first to obtain a key).",
    inputSchema: {
      type: "object",
      properties: {
        entityType: {
          type: "string",
          enum: ["houseplant", "planter", "garden_cell_group"],
        },
        entityId: { type: "number" },
        content: { type: "string" },
        observedAt: {
          type: "string",
          description: "ISO 8601 timestamp of when the observation was made.",
        },
        photoKeys: {
          type: "array",
          items: { type: "string" },
          description: "Blob keys from upload_photo to attach to this note.",
        },
      },
      required: ["entityType", "entityId"],
    },
    handler: async (args) =>
      createNote({
        entityType: requireString(args, "entityType"),
        entityId: requireNumber(args, "entityId"),
        content: optionalString(args, "content") ?? null,
        observedAt: optionalString(args, "observedAt") ?? null,
        photoKeys: Array.isArray(args.photoKeys)
          ? (args.photoKeys as string[])
          : undefined,
      }),
  },
  {
    name: "update_note",
    description:
      "Update a note by id. content and observedAt are editable. Use photoKeys to attach more photos and removePhotoIds to detach existing ones.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        content: { type: "string" },
        observedAt: { type: "string" },
        photoKeys: { type: "array", items: { type: "string" } },
        removePhotoIds: { type: "array", items: { type: "number" } },
      },
      required: ["id"],
    },
    handler: async (args) =>
      updateNote(requireNumber(args, "id"), {
        content: optionalString(args, "content") ?? null,
        observedAt: optionalString(args, "observedAt") ?? null,
        photoKeys: Array.isArray(args.photoKeys)
          ? (args.photoKeys as string[])
          : undefined,
        removePhotoIds: Array.isArray(args.removePhotoIds)
          ? (args.removePhotoIds as number[])
          : undefined,
      }),
  },

  // ── Photos ─────────────────────────────────────────────────────────────
  {
    name: "upload_photo",
    description:
      "Upload a small image inline as base64. Returns a blobKey you can pass to create_note (photoKeys) or to a planter's photoBlobKey field. PREFER the HTTP endpoint for any local file or image larger than ~100KB: `POST /api/mcp/upload?filename=<name>` with `Authorization: Bearer <token>`, `Content-Type: image/<type>`, and raw bytes as the body (e.g. `curl --data-binary @photo.jpg`). The endpoint returns `{ key }` in the same format as this tool. Use this tool only when the agent cannot make outbound HTTP requests.",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "string",
          description: "Base64-encoded image bytes (no data: prefix).",
        },
        filename: { type: "string" },
        mimeType: {
          type: "string",
          description: "e.g. image/jpeg, image/png, image/webp",
        },
      },
      required: ["data", "filename", "mimeType"],
    },
    handler: async (args) => {
      const data = requireString(args, "data");
      const filename = requireString(args, "filename");
      const mimeType = requireString(args, "mimeType");
      const bytes = Uint8Array.from(Buffer.from(data, "base64"));
      const key = await uploadPhotoBytes(bytes, filename, mimeType);
      return { key };
    },
  },
  {
    name: "get_photo",
    description:
      "Retrieve a stored photo by blobKey. Returns the image as MCP image content the agent can view directly.",
    inputSchema: {
      type: "object",
      properties: { key: { type: "string" } },
      required: ["key"],
    },
    handler: async (args) => {
      const key = requireString(args, "key");
      const result = await getPhoto(key);
      if (!result) throw new NotFoundError("Photo not found");
      const base64 = Buffer.from(result.data).toString("base64");
      return {
        content: [
          { type: "image", data: base64, mimeType: result.contentType },
        ],
      };
    },
  },
];

export const toolsByName = new Map(tools.map((t) => [t.name, t]));
