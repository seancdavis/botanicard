import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const houseplants = pgTable("houseplants", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  cardId: varchar("card_id", { length: 4 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  parentId: integer("parent_id"),
  planterId: integer("planter_id"),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const planters = pgTable("planters", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  cardId: varchar("card_id", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  photoBlobKey: varchar("photo_blob_key", { length: 500 }),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const gardenSeasons = pgTable("garden_seasons", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  year: integer("year").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gardenCells = pgTable("garden_cells", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  cardId: varchar("card_id", { length: 20 }).notNull().unique(),
  seasonId: integer("season_id").notNull(),
  plantType: varchar("plant_type", { length: 255 }).notNull(),
  variety: varchar("variety", { length: 255 }),
  seedCount: integer("seed_count"),
  status: varchar("status", { length: 50 }).default("seeded").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const photos = pgTable("photos", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  noteId: integer("note_id").notNull(),
  blobKey: varchar("blob_key", { length: 500 }).notNull(),
  filename: varchar("filename", { length: 255 }),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
