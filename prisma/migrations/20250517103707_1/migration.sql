/*
  Warnings:

  - You are about to drop the `Appointment` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('NEW', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StatusReportStatus" AS ENUM ('NEW', 'ACTIVE', 'ARCHIVED');

-- DropTable
DROP TABLE "Appointment";

-- CreateTable
CREATE TABLE "appointment" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
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
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processingDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter" (
    "id" SERIAL NOT NULL,
    "headerLogo" TEXT,
    "headerBanner" TEXT,
    "footerText" TEXT,
    "unsubscribeLink" TEXT,
    "testEmailRecipients" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT,
    "metadata" TEXT,
    "status" "GroupStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsible_person" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "email" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "responsible_person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_report" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "reporterFirstName" VARCHAR(50) NOT NULL,
    "reporterLastName" VARCHAR(50) NOT NULL,
    "fileUrls" TEXT,
    "status" "StatusReportStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "status_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_processed_idx" ON "appointment"("processed");

-- CreateIndex
CREATE INDEX "appointment_status_idx" ON "appointment"("status");

-- CreateIndex
CREATE INDEX "appointment_featured_idx" ON "appointment"("featured");

-- CreateIndex
CREATE UNIQUE INDEX "group_slug_key" ON "group"("slug");

-- CreateIndex
CREATE INDEX "group_status_idx" ON "group"("status");

-- CreateIndex
CREATE INDEX "group_name_idx" ON "group"("name");

-- CreateIndex
CREATE INDEX "responsible_person_groupId_idx" ON "responsible_person"("groupId");

-- CreateIndex
CREATE INDEX "status_report_status_idx" ON "status_report"("status");

-- CreateIndex
CREATE INDEX "status_report_groupId_idx" ON "status_report"("groupId");

-- CreateIndex
CREATE INDEX "status_report_createdAt_idx" ON "status_report"("createdAt");

-- AddForeignKey
ALTER TABLE "responsible_person" ADD CONSTRAINT "responsible_person_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_report" ADD CONSTRAINT "status_report_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
