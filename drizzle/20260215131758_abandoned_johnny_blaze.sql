CREATE TABLE "approved_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"is_admin" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"added_by" varchar(255),
	"notes" text,
	CONSTRAINT "approved_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "garden_cells" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" varchar(20) NOT NULL,
	"season_id" integer NOT NULL,
	"plant_type" varchar(255) NOT NULL,
	"variety" varchar(255),
	"seed_count" integer,
	"status" varchar(50) DEFAULT 'seeded' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "garden_cells_card_id_unique" UNIQUE("card_id")
);
--> statement-breakpoint
CREATE TABLE "garden_seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"year" integer NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "houseplants" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" varchar(4) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"parent_id" integer,
	"planter_id" integer,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "houseplants_card_id_unique" UNIQUE("card_id")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"content" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"note_id" integer NOT NULL,
	"blob_key" varchar(500) NOT NULL,
	"filename" varchar(255),
	"caption" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planters" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "planters_card_id_unique" UNIQUE("card_id")
);
