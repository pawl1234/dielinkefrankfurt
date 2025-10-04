-- CreateTable
CREATE TABLE IF NOT EXISTS "Appointment" (
    "id" SERIAL PRIMARY KEY,
    "teaser" TEXT NOT NULL,
    "mainText" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3),
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "recurringText" TEXT,
    "fileUrls" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processingDate" TIMESTAMP(3)
);

-- CreateMigrationsTable
-- This is needed for migration history tracking
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("id")
);
