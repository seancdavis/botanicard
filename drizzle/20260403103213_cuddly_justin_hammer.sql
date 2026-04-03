ALTER TABLE "garden_cell_groups" ADD COLUMN "cell_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "garden_cell_groups" ADD COLUMN "desired_yield" integer;--> statement-breakpoint
ALTER TABLE "garden_cell_groups" ADD COLUMN "actual_yield" integer;