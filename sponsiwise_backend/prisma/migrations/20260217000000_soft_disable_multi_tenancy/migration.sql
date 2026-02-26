-- ============================================================
-- Soft Disable Multi-Tenancy Migration
-- ============================================================
-- This migration adds support for the sponsorship inventory system
-- and sets up the global tenant for single-tenant mode.

-- Create global tenant if it doesn't exist
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

-- Verify the tenant was created
SELECT id, name, slug, status, created_at, updated_at 
FROM tenants 
WHERE id = '00000000-0000-0000-0000-000000000001';

