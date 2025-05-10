/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `Appointment` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "teaser" TEXT NOT NULL,
    "mainText" TEXT NOT NULL,
    "startDateTime" DATETIME NOT NULL,
    "endDateTime" DATETIME,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "recurringText" TEXT,
    "fileUrls" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processingDate" DATETIME
);
INSERT INTO "new_Appointment" ("city", "createdAt", "endDateTime", "firstName", "id", "lastName", "mainText", "postalCode", "processed", "processingDate", "recurringText", "startDateTime", "state", "street", "teaser", "updatedAt") SELECT "city", "createdAt", "endDateTime", "firstName", "id", "lastName", "mainText", "postalCode", "processed", "processingDate", "recurringText", "startDateTime", "state", "street", "teaser", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
