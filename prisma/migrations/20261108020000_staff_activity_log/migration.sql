CREATE TABLE IF NOT EXISTS "LoginEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL DEFAULT '',
    "method" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LoginEvent_userId_createdAt_idx" ON "LoginEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoginEvent_email_createdAt_idx" ON "LoginEvent"("email", "createdAt");

CREATE TABLE IF NOT EXISTS "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT '',
    "entityId" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");
