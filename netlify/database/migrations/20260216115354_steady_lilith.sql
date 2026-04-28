CREATE TABLE "garden_cells" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "garden_cells_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
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
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "garden_seasons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"year" integer NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "houseplants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "houseplants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
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
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"content" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "photos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"note_id" integer NOT NULL,
	"blob_key" varchar(500) NOT NULL,
	"filename" varchar(255),
	"caption" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "planters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"card_id" varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "planters_card_id_unique" UNIQUE("card_id")
);
