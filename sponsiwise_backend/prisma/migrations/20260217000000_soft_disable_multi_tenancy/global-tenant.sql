-- ============================================================
-- Global Tenant Creation Script
-- ============================================================
-- This script creates a single global tenant for the application.
-- It is idempotent - safe to run multiple times.
-- 
-- GLOBAL_TENANT_ID: 00000000-0000-0000-0000-000000000001
-- Name: Global
-- Slug: global
-- Status: ACTIVE
-- ============================================================

-- Insert global tenant if it doesn't exist
INSERT INTO tenants (id, name, slug, status, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Global',
    'global',
    'ACTIVE'::"TenantStatus",
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify the tenant was created/updated
SELECT id, name, slug, status, created_at, updated_at 
FROM tenants 
WHERE id = '00000000-0000-0000-0000-000000000001';

