/**
 * Central registry of BullMQ queue names.
 *
 * Every queue in the system MUST be registered here so that:
 *  - Producers and workers reference the same constant
 *  - Typo-driven bugs are caught at compile time
 *  - It's trivial to see all queues at a glance
 *
 * Convention: SCREAMING_SNAKE for the constant, kebab-case for the value.
 *
 * When adding a new queue in a future step:
 *   1. Add the constant here
 *   2. Register it in QueueModule
 *   3. Create a processor in the workers/ folder
 */

/** Email delivery (welcome, verification, status updates) */
export const QUEUE_EMAIL = 'email';

/** In-app / push notifications */
export const QUEUE_NOTIFICATIONS = 'notifications';

/** All registered queue names — used by QueueModule to bulk-register */
export const ALL_QUEUES = [QUEUE_EMAIL, QUEUE_NOTIFICATIONS] as const;
