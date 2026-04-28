import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema";

export const db = drizzle({ schema });

export {
  houseplants,
  planters,
  gardenSeasons,
  gardenCellGroups,
  notes,
  photos,
} from "./schema";
