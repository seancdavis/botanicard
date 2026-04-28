ALTER TABLE "garden_cells" RENAME TO "garden_cell_groups";--> statement-breakpoint
ALTER TABLE "garden_cell_groups" RENAME CONSTRAINT "garden_cells_card_id_unique" TO "garden_cell_groups_card_id_unique";--> statement-breakpoint
ALTER SEQUENCE "garden_cells_id_seq" RENAME TO "garden_cell_groups_id_seq";--> statement-breakpoint
UPDATE "notes" SET "entity_type" = 'garden_cell_group' WHERE "entity_type" = 'garden_cell';
