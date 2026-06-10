-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('processing', 'needs_review', 'ready', 'failed');

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "merchant_name" TEXT,
    "merchant_nif" TEXT,
    "document_number" TEXT,
    "document_date" DATE,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "subtotal_cents" INTEGER,
    "tax_cents" INTEGER,
    "discount_cents" INTEGER,
    "tip_cents" INTEGER,
    "total_cents" INTEGER,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'processing',
    "image_storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "raw_ocr_json" JSONB,
    "warnings" JSONB,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_items" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "total_cents" INTEGER NOT NULL,
    "category" TEXT,
    "confidence" DOUBLE PRECISION,
    "position" INTEGER NOT NULL,
    "suspect" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
