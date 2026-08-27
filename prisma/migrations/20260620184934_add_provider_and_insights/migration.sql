ALTER TABLE "UsageRecord" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE "UsageRecord" ADD COLUMN "insights" TEXT;
