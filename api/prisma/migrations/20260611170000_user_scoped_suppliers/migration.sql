-- Fornecedores e correções passam a ser isolados por utilizador.
-- A migração preserva faturas existentes duplicando fornecedores partilhados.

-- Drop old global uniqueness before duplicating rows.
DROP INDEX IF EXISTS "suppliers_nif_key";
DROP INDEX IF EXISTS "suppliers_normalized_name_key";
DROP INDEX IF EXISTS "category_corrections_normalized_merchant_name_key";

-- Suppliers: assign the original row to one owner, duplicate for other owners.
ALTER TABLE "suppliers" ADD COLUMN "user_id" TEXT;

WITH owner AS (
  SELECT s."id" AS supplier_id, MIN(r."user_id") AS user_id
  FROM "suppliers" s
  JOIN "receipts" r ON r."supplier_id" = s."id"
  GROUP BY s."id"
)
UPDATE "suppliers" s
SET "user_id" = owner.user_id
FROM owner
WHERE s."id" = owner.supplier_id;

INSERT INTO "suppliers" (
  "id",
  "user_id",
  "name",
  "nif",
  "normalized_name",
  "category",
  "created_at",
  "updated_at"
)
SELECT
  'sup_' || substr(md5(s."id" || ':' || ru."user_id"), 1, 24),
  ru."user_id",
  s."name",
  s."nif",
  s."normalized_name",
  s."category",
  s."created_at",
  s."updated_at"
FROM "suppliers" s
JOIN (
  SELECT DISTINCT "supplier_id", "user_id"
  FROM "receipts"
  WHERE "supplier_id" IS NOT NULL
) ru ON ru."supplier_id" = s."id"
WHERE s."user_id" IS NOT NULL
  AND s."user_id" <> ru."user_id";

UPDATE "receipts" r
SET "supplier_id" = 'sup_' || substr(md5(s."id" || ':' || r."user_id"), 1, 24)
FROM "suppliers" s
WHERE r."supplier_id" = s."id"
  AND s."user_id" IS NOT NULL
  AND s."user_id" <> r."user_id";

DELETE FROM "suppliers"
WHERE "user_id" IS NULL;

ALTER TABLE "suppliers" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "suppliers"
ADD CONSTRAINT "suppliers_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "suppliers_user_id_nif_key" ON "suppliers"("user_id", "nif");
CREATE UNIQUE INDEX "suppliers_user_id_normalized_name_key" ON "suppliers"("user_id", "normalized_name");

-- Category corrections: copy existing global corrections to current users, then scope future writes.
ALTER TABLE "category_corrections" ADD COLUMN "user_id" TEXT;

INSERT INTO "category_corrections" (
  "id",
  "user_id",
  "normalized_merchant_name",
  "category",
  "created_at",
  "updated_at"
)
SELECT
  'cc_' || substr(md5(cc."id" || ':' || u."id"), 1, 24),
  u."id",
  cc."normalized_merchant_name",
  cc."category",
  cc."created_at",
  cc."updated_at"
FROM "category_corrections" cc
CROSS JOIN "users" u
WHERE u."id" <> (SELECT MIN("id") FROM "users");

UPDATE "category_corrections"
SET "user_id" = (SELECT MIN("id") FROM "users")
WHERE "user_id" IS NULL;

DELETE FROM "category_corrections"
WHERE "user_id" IS NULL;

ALTER TABLE "category_corrections" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "category_corrections"
ADD CONSTRAINT "category_corrections_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "category_corrections_user_id_normalized_merchant_name_key"
ON "category_corrections"("user_id", "normalized_merchant_name");
