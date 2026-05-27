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
import { getPhoto } from "../services/photos";
import { finalizeUpload, prepareUpload } from "../services/uploads";

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
      "Partial update of a houseplant by id. Only the fields you include are changed; omitted fields are left untouched.",
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
      required: ["id"],
    },
    handler: async (args) =>
      updateHouseplant(requireNumber(args, "id"), {
        name: "name" in args ? requireString(args, "name") : undefined,
        description: optionalString(args, "description"),
        parentId: optionalNumber(args, "parentId"),
        planterId: optionalNumber(args, "planterId"),
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
    description:
      "Partial update of a planter by id. Only the fields you include are changed; omitted fields are left untouched.",
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
      required: ["id"],
    },
    handler: async (args) =>
      updatePlanter(requireNumber(args, "id"), {
        name: "name" in args ? requireString(args, "name") : undefined,
        description: optionalString(args, "description"),
        photoBlobKey: optionalString(args, "photoBlobKey"),
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
    description:
      "Partial update of a garden cell group by id. Only the fields you include are changed; omitted fields are left untouched.",
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
      required: ["id"],
    },
    handler: async (args) =>
      updateCellGroup(requireNumber(args, "id"), {
        plantType:
          "plantType" in args ? requireString(args, "plantType") : undefined,
        variety: optionalString(args, "variety"),
        cellCount: optionalNumber(args, "cellCount"),
        seedCount: optionalNumber(args, "seedCount"),
        desiredYield: optionalNumber(args, "desiredYield"),
        actualYield: optionalNumber(args, "actualYield"),
        status: optionalString(args, "status"),
        description: optionalString(args, "description"),
      }),
  },

  // ── Notes ──────────────────────────────────────────────────────────────
  {
    name: "create_note",
    description:
      "Attach a note to a houseplant, planter, or garden_cell_group. Provide entityType + entityId. Optionally attach previously-uploaded files via photoKeys — use prepare_upload + PUT + finalize_upload to obtain a key.",
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
          description:
            "Blob keys from finalize_upload to attach to this note.",
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

  // ── Uploads (presigned-URL flow) ───────────────────────────────────────
  {
    name: "prepare_upload",
    description:
      "Prepare a presigned upload. Returns a short-lived signed URL the agent can PUT raw file bytes to (no Authorization header needed on the PUT), plus an opaque uploadHandle. After the PUT succeeds, call finalize_upload with the handle to get back a stable blob key for use in create_note (photoKeys) or a planter's photoBlobKey. The URL expires in 5 minutes and is single-use.",
    inputSchema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "Original filename (used for metadata, not the key).",
        },
        contentType: {
          type: "string",
          description:
            "MIME type the agent will send in Content-Type on the PUT (e.g. image/jpeg, application/pdf).",
        },
        size: {
          type: "number",
          description:
            "Declared upper-bound byte count. The PUT will be rejected if the body exceeds this value.",
        },
      },
      required: ["filename", "contentType", "size"],
    },
    handler: async (args) =>
      prepareUpload({
        filename: requireString(args, "filename"),
        contentType: requireString(args, "contentType"),
        size: requireNumber(args, "size"),
      }),
  },
  {
    name: "finalize_upload",
    description:
      "Finalize a presigned upload after the agent has PUT raw bytes to the uploadUrl returned by prepare_upload. Verifies the blob exists and returns a stable { key } the agent can pass to create_note (photoKeys) or to a planter's photoBlobKey.",
    inputSchema: {
      type: "object",
      properties: {
        uploadHandle: {
          type: "string",
          description: "The uploadHandle returned by prepare_upload.",
        },
      },
      required: ["uploadHandle"],
    },
    handler: async (args) =>
      finalizeUpload(requireString(args, "uploadHandle")),
  },

  // ── Photos ─────────────────────────────────────────────────────────────
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
