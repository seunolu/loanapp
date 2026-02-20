DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'TenantDisbursement_tenantId_providerReference_key'
  ) THEN
    CREATE UNIQUE INDEX "TenantDisbursement_tenantId_providerReference_key"
      ON "TenantDisbursement"("tenantId", "providerReference");
  END IF;
END $$;