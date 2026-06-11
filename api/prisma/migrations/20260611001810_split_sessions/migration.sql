-- CreateEnum
CREATE TYPE "SplitSessionStatus" AS ENUM ('open', 'closed');

-- CreateTable
CREATE TABLE "split_sessions" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "public_token" TEXT NOT NULL,
    "status" "SplitSessionStatus" NOT NULL DEFAULT 'open',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "split_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "split_session_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_item_claims" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "receipt_item_id" TEXT NOT NULL,
    "quantity_claimed" DECIMAL(10,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participant_item_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "split_sessions_public_token_key" ON "split_sessions"("public_token");

-- CreateIndex
CREATE UNIQUE INDEX "participant_item_claims_participant_id_receipt_item_id_key" ON "participant_item_claims"("participant_id", "receipt_item_id");

-- AddForeignKey
ALTER TABLE "split_sessions" ADD CONSTRAINT "split_sessions_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_split_session_id_fkey" FOREIGN KEY ("split_session_id") REFERENCES "split_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_item_claims" ADD CONSTRAINT "participant_item_claims_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_item_claims" ADD CONSTRAINT "participant_item_claims_receipt_item_id_fkey" FOREIGN KEY ("receipt_item_id") REFERENCES "receipt_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
