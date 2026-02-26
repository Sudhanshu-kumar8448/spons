/**
 * Global Tenant Constants
 * 
 * This file contains the GLOBAL_TENANT_ID used throughout the application
 * after converting from multi-tenant to single-tenant mode.
 * 
 * IMPORTANT: This UUID should NEVER change after initial setup.
 * All users, companies, organizers, events, etc. will belong to this tenant.
 */

export const GLOBAL_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Check if a tenant ID is the global tenant
 */
export const isGlobalTenant = (tenantId: string): boolean => {
  return tenantId === GLOBAL_TENANT_ID;
};

