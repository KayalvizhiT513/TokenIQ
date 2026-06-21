-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pullRequestId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "cachedInputTokens" INTEGER NOT NULL,
    "costUsd" REAL NOT NULL,
    "actualCostUsd" REAL,
    "actualInputTokens" INTEGER,
    "actualOutputTokens" INTEGER,
    "insights" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UsageRecord_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UsageRecord" ("actualCostUsd", "actualInputTokens", "actualOutputTokens", "cachedInputTokens", "costUsd", "createdAt", "generatedAt", "id", "inputTokens", "model", "outputTokens", "pullRequestId", "updatedAt") SELECT "actualCostUsd", "actualInputTokens", "actualOutputTokens", "cachedInputTokens", "costUsd", "createdAt", "generatedAt", "id", "inputTokens", "model", "outputTokens", "pullRequestId", "updatedAt" FROM "UsageRecord";
DROP TABLE "UsageRecord";
ALTER TABLE "new_UsageRecord" RENAME TO "UsageRecord";
CREATE UNIQUE INDEX "UsageRecord_pullRequestId_key" ON "UsageRecord"("pullRequestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
