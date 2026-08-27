ALTER TABLE "Integration" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);
ALTER TABLE "Integration" ADD COLUMN "lastSyncError" TEXT;

CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "integrationId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modelVersion" TEXT,
    "requestId" TEXT,
    "traceId" TEXT,
    "spanId" TEXT,
    "sourceEventId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "latencyMs" INTEGER,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION,
    "statusCode" INTEGER,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UsageEvent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UsageEvent_orgId_sourceEventId_key" ON "UsageEvent"("orgId", "sourceEventId");
CREATE INDEX "UsageEvent_orgId_startedAt_idx" ON "UsageEvent"("orgId", "startedAt");
CREATE INDEX "UsageEvent_orgId_provider_model_idx" ON "UsageEvent"("orgId", "provider", "model");
CREATE INDEX "UsageEvent_orgId_traceId_idx" ON "UsageEvent"("orgId", "traceId");
