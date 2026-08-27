CREATE TABLE "ModelConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputCostPerMillion" DOUBLE PRECISION NOT NULL,
    "outputCostPerMillion" DOUBLE PRECISION NOT NULL,
    "cachedCostPerMillion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModelConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "Repository" ADD COLUMN "modelConfigId" TEXT;
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_modelConfigId_fkey" FOREIGN KEY ("modelConfigId") REFERENCES "ModelConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ModelConfig_orgId_provider_model_key" ON "ModelConfig"("orgId", "provider", "model");
CREATE INDEX "ModelConfig_orgId_isActive_idx" ON "ModelConfig"("orgId", "isActive");
