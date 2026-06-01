-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_kitaId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "kitaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_kitaId_fkey" FOREIGN KEY ("kitaId") REFERENCES "KiTA"("id") ON DELETE SET NULL ON UPDATE CASCADE;
