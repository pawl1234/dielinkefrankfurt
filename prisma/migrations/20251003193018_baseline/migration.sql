-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."GroupStatus" AS ENUM ('NEW', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."StatusReportStatus" AS ENUM ('NEW', 'ACTIVE', 'ARCHIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."AntragStatus" AS ENUM ('NEU', 'AKZEPTIERT', 'ABGELEHNT');

-- CreateTable
CREATE TABLE "public"."appointment" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
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
    "statusChangeDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."newsletter" (
    "id" SERIAL NOT NULL,
    "headerLogo" TEXT,
    "headerBanner" TEXT,
    "footerText" TEXT,
    "unsubscribeLink" TEXT,
    "testEmailRecipients" TEXT,
    "batchSize" INTEGER NOT NULL DEFAULT 100,
    "batchDelay" INTEGER NOT NULL DEFAULT 1000,
    "fromEmail" TEXT,
    "fromName" TEXT,
    "replyToEmail" TEXT,
    "subjectTemplate" TEXT,
    "emailSalt" TEXT,
    "chunkSize" INTEGER NOT NULL DEFAULT 50,
    "chunkDelay" INTEGER NOT NULL DEFAULT 500,
    "emailTimeout" INTEGER NOT NULL DEFAULT 60000,
    "connectionTimeout" INTEGER NOT NULL DEFAULT 30000,
    "greetingTimeout" INTEGER NOT NULL DEFAULT 30000,
    "socketTimeout" INTEGER NOT NULL DEFAULT 45000,
    "maxConnections" INTEGER NOT NULL DEFAULT 5,
    "maxMessages" INTEGER NOT NULL DEFAULT 100,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "maxBackoffDelay" INTEGER NOT NULL DEFAULT 10000,
    "retryChunkSizes" TEXT NOT NULL DEFAULT '10,5,1',
    "compositeWidth" INTEGER DEFAULT 600,
    "compositeHeight" INTEGER DEFAULT 200,
    "logoTopOffset" INTEGER DEFAULT 20,
    "logoLeftOffset" INTEGER DEFAULT 20,
    "logoHeight" INTEGER DEFAULT 60,
    "compositeImageUrl" TEXT,
    "compositeImageHash" TEXT,
    "maxFeaturedAppointments" INTEGER NOT NULL DEFAULT 5,
    "maxUpcomingAppointments" INTEGER NOT NULL DEFAULT 20,
    "maxStatusReportsPerGroup" INTEGER NOT NULL DEFAULT 3,
    "maxGroupsWithReports" INTEGER NOT NULL DEFAULT 10,
    "statusReportTitleLimit" INTEGER NOT NULL DEFAULT 100,
    "statusReportContentLimit" INTEGER NOT NULL DEFAULT 5000,
    "aiSystemPrompt" TEXT,
    "aiVorstandsprotokollPrompt" TEXT,
    "aiTopicExtractionPrompt" TEXT,
    "aiRefinementPrompt" TEXT,
    "aiModel" TEXT DEFAULT 'claude-3-5-sonnet-latest',
    "anthropicApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT,
    "metadata" TEXT,
    "status" "public"."GroupStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."responsible_person" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "email" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "responsible_person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."status_report" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "reporterFirstName" VARCHAR(50) NOT NULL,
    "reporterLastName" VARCHAR(50) NOT NULL,
    "fileUrls" TEXT,
    "status" "public"."StatusReportStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "status_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hashed_recipient" (
    "id" TEXT NOT NULL,
    "hashedEmail" TEXT NOT NULL,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSent" TIMESTAMP(3),

    CONSTRAINT "hashed_recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."newsletter_item" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "introductionText" TEXT NOT NULL,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER,
    "settings" TEXT,

    CONSTRAINT "newsletter_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."newsletter_analytics" (
    "id" TEXT NOT NULL,
    "newsletterId" TEXT NOT NULL,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "totalOpens" INTEGER NOT NULL DEFAULT 0,
    "uniqueOpens" INTEGER NOT NULL DEFAULT 0,
    "pixelToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."newsletter_link_click" (
    "id" TEXT NOT NULL,
    "analyticsId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "linkId" TEXT,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueClicks" INTEGER NOT NULL DEFAULT 0,
    "firstClick" TIMESTAMP(3),
    "lastClick" TIMESTAMP(3),

    CONSTRAINT "newsletter_link_click_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."newsletter_fingerprint" (
    "id" TEXT NOT NULL,
    "analyticsId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "firstOpenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOpenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_fingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."newsletter_link_click_fingerprint" (
    "id" TEXT NOT NULL,
    "linkClickId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "firstClickAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastClickAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_link_click_fingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."antrag" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "email" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "summary" VARCHAR(300) NOT NULL,
    "purposes" TEXT NOT NULL,
    "fileUrls" TEXT,
    "status" "public"."AntragStatus" NOT NULL DEFAULT 'NEU',
    "decisionComment" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "antrag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."antrag_configuration" (
    "id" SERIAL NOT NULL,
    "recipientEmails" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "antrag_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_processed_idx" ON "public"."appointment"("processed");

-- CreateIndex
CREATE INDEX "appointment_status_idx" ON "public"."appointment"("status");

-- CreateIndex
CREATE INDEX "appointment_featured_idx" ON "public"."appointment"("featured");

-- CreateIndex
CREATE UNIQUE INDEX "group_slug_key" ON "public"."group"("slug");

-- CreateIndex
CREATE INDEX "group_status_idx" ON "public"."group"("status");

-- CreateIndex
CREATE INDEX "group_name_idx" ON "public"."group"("name");

-- CreateIndex
CREATE INDEX "responsible_person_groupId_idx" ON "public"."responsible_person"("groupId");

-- CreateIndex
CREATE INDEX "status_report_status_idx" ON "public"."status_report"("status");

-- CreateIndex
CREATE INDEX "status_report_groupId_idx" ON "public"."status_report"("groupId");

-- CreateIndex
CREATE INDEX "status_report_createdAt_idx" ON "public"."status_report"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "public"."users"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "hashed_recipient_hashedEmail_key" ON "public"."hashed_recipient"("hashedEmail");

-- CreateIndex
CREATE INDEX "hashed_recipient_hashedEmail_idx" ON "public"."hashed_recipient"("hashedEmail");

-- CreateIndex
CREATE INDEX "newsletter_item_status_idx" ON "public"."newsletter_item"("status");

-- CreateIndex
CREATE INDEX "newsletter_item_createdAt_idx" ON "public"."newsletter_item"("createdAt");

-- CreateIndex
CREATE INDEX "newsletter_item_sentAt_idx" ON "public"."newsletter_item"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_analytics_newsletterId_key" ON "public"."newsletter_analytics"("newsletterId");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_analytics_pixelToken_key" ON "public"."newsletter_analytics"("pixelToken");

-- CreateIndex
CREATE INDEX "newsletter_analytics_pixelToken_idx" ON "public"."newsletter_analytics"("pixelToken");

-- CreateIndex
CREATE INDEX "newsletter_analytics_newsletterId_idx" ON "public"."newsletter_analytics"("newsletterId");

-- CreateIndex
CREATE INDEX "newsletter_analytics_createdAt_idx" ON "public"."newsletter_analytics"("createdAt");

-- CreateIndex
CREATE INDEX "newsletter_link_click_analyticsId_idx" ON "public"."newsletter_link_click"("analyticsId");

-- CreateIndex
CREATE INDEX "newsletter_link_click_linkType_idx" ON "public"."newsletter_link_click"("linkType");

-- CreateIndex
CREATE INDEX "newsletter_link_click_clickCount_idx" ON "public"."newsletter_link_click"("clickCount");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_link_click_analyticsId_url_key" ON "public"."newsletter_link_click"("analyticsId", "url");

-- CreateIndex
CREATE INDEX "newsletter_fingerprint_analyticsId_idx" ON "public"."newsletter_fingerprint"("analyticsId");

-- CreateIndex
CREATE INDEX "newsletter_fingerprint_fingerprint_idx" ON "public"."newsletter_fingerprint"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_fingerprint_analyticsId_fingerprint_key" ON "public"."newsletter_fingerprint"("analyticsId", "fingerprint");

-- CreateIndex
CREATE INDEX "newsletter_link_click_fingerprint_linkClickId_idx" ON "public"."newsletter_link_click_fingerprint"("linkClickId");

-- CreateIndex
CREATE INDEX "newsletter_link_click_fingerprint_fingerprint_idx" ON "public"."newsletter_link_click_fingerprint"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_link_click_fingerprint_linkClickId_fingerprint_key" ON "public"."newsletter_link_click_fingerprint"("linkClickId", "fingerprint");

-- CreateIndex
CREATE INDEX "antrag_status_idx" ON "public"."antrag"("status");

-- CreateIndex
CREATE INDEX "antrag_createdAt_idx" ON "public"."antrag"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."responsible_person" ADD CONSTRAINT "responsible_person_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."status_report" ADD CONSTRAINT "status_report_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."newsletter_analytics" ADD CONSTRAINT "newsletter_analytics_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "public"."newsletter_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."newsletter_link_click" ADD CONSTRAINT "newsletter_link_click_analyticsId_fkey" FOREIGN KEY ("analyticsId") REFERENCES "public"."newsletter_analytics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."newsletter_fingerprint" ADD CONSTRAINT "newsletter_fingerprint_analyticsId_fkey" FOREIGN KEY ("analyticsId") REFERENCES "public"."newsletter_analytics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."newsletter_link_click_fingerprint" ADD CONSTRAINT "newsletter_link_click_fingerprint_linkClickId_fkey" FOREIGN KEY ("linkClickId") REFERENCES "public"."newsletter_link_click"("id") ON DELETE CASCADE ON UPDATE CASCADE;

