-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "category" TEXT,
ADD COLUMN     "supplier_id" TEXT;

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nif" TEXT,
    "normalized_name" TEXT NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_corrections" (
    "id" TEXT NOT NULL,
    "normalized_merchant_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_taxes" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "base_cents" INTEGER NOT NULL,
    "amount_cents" INTEGER NOT NULL,

    CONSTRAINT "receipt_taxes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_nif_key" ON "suppliers"("nif");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_normalized_name_key" ON "suppliers"("normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "category_corrections_normalized_merchant_name_key" ON "category_corrections"("normalized_merchant_name");

-- AddForeignKey
ALTER TABLE "receipt_taxes" ADD CONSTRAINT "receipt_taxes_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
