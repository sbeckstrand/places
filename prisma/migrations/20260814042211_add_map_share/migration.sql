-- CreateTable
CREATE TABLE "MapShare" (
    "id" TEXT NOT NULL,
    "sharedWithEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "MapShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapShare_sharedWithEmail_idx" ON "MapShare"("sharedWithEmail");

-- CreateIndex
CREATE UNIQUE INDEX "MapShare_ownerId_sharedWithEmail_key" ON "MapShare"("ownerId", "sharedWithEmail");

-- AddForeignKey
ALTER TABLE "MapShare" ADD CONSTRAINT "MapShare_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
