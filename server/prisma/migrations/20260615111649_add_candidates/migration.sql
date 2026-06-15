-- AlterTable
ALTER TABLE "daily_routes" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "daily_candidates" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_candidates_pkey" PRIMARY KEY ("id")
);
