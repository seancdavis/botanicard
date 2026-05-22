CREATE TABLE "upload_handles" (
	"upload_id" varchar(100) PRIMARY KEY NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"content_type" varchar(255) NOT NULL,
	"declared_size" integer NOT NULL,
	"uploaded_size" integer,
	"filename" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
