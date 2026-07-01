-- AlterTable
ALTER TABLE "generations" ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "sunoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "style" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "personas_brandId_idx" ON "personas"("brandId");

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
