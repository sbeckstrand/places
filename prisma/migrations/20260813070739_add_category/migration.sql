-- CreateEnum
CREATE TYPE "Category" AS ENUM ('FOOD', 'ENTERTAINMENT', 'NATURE', 'OTHER');

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "category" "Category" NOT NULL DEFAULT 'OTHER';
