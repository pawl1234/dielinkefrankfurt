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