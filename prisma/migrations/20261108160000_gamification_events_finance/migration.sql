CREATE TYPE "TournamentStatus" AS ENUM ('OPEN', 'FULL', 'COMPLETED', 'CANCELLED');
CREATE TYPE "LfgStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED');
CREATE TYPE "EscrowStatus" AS ENUM ('IN_ESCROW', 'COMPLETED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "User"
ADD COLUMN "badges" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "isPremium" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Tournament" (
  "id" TEXT NOT NULL,
  "game" TEXT NOT NULL,
  "maxSlots" INTEGER NOT NULL,
  "eventDate" TIMESTAMP(3) NOT NULL,
  "status" "TournamentStatus" NOT NULL DEFAULT 'OPEN',
  "bracket" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Tournament_status_eventDate_idx" ON "Tournament"("status", "eventDate");

CREATE TABLE "Participant" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "leaderId" TEXT NOT NULL,
  "teamName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Participant_tournamentId_leaderId_key" ON "Participant"("tournamentId", "leaderId");
CREATE INDEX "Participant_tournamentId_createdAt_idx" ON "Participant"("tournamentId", "createdAt");
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LfgPost" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "game" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "maxSlots" INTEGER NOT NULL,
  "status" "LfgStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LfgPost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LfgPost_status_scheduledAt_idx" ON "LfgPost"("status", "scheduledAt");
ALTER TABLE "LfgPost" ADD CONSTRAINT "LfgPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LfgJoin" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LfgJoin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LfgJoin_postId_userId_key" ON "LfgJoin"("postId", "userId");
CREATE INDEX "LfgJoin_postId_idx" ON "LfgJoin"("postId");
ALTER TABLE "LfgJoin" ADD CONSTRAINT "LfgJoin_postId_fkey" FOREIGN KEY ("postId") REFERENCES "LfgPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LfgJoin" ADD CONSTRAINT "LfgJoin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EscrowTransaction" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "EscrowStatus" NOT NULL DEFAULT 'IN_ESCROW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "EscrowTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EscrowTransaction_status_createdAt_idx" ON "EscrowTransaction"("status", "createdAt");
CREATE INDEX "EscrowTransaction_postId_status_idx" ON "EscrowTransaction"("postId", "status");
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Donation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
  "gatewayRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Donation_gatewayRef_key" ON "Donation"("gatewayRef");
CREATE INDEX "Donation_userId_createdAt_idx" ON "Donation"("userId", "createdAt");
CREATE INDEX "Donation_status_createdAt_idx" ON "Donation"("status", "createdAt");
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
