import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeliverableRepository } from './deliverable.repository';
import { SponsorshipTierRepository } from '../sponsorship-tiers/sponsorship-tier.repository';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDeliverableFormDto } from './dto/create-deliverable-form.dto';
import { UpdateDeliverableFormDto } from './dto/update-deliverable-form.dto';
import { FillDeliverableFormDto } from './dto/fill-deliverable-form.dto';
import {
  CreateDeliverableTemplateDto,
  UpdateDeliverableTemplateDto,
} from './dto/deliverable-template.dto';
import {
  DELIVERABLES_FORM_SENT_EVENT,
  DeliverablesFormSentEvent,
} from '../common/events/deliverables-form-sent.event';
import {
  DELIVERABLES_BATCH_SENT_EVENT,
  DeliverablesBatchSentEvent,
} from '../common/events/deliverables-batch-sent.event';
import { PrismaService } from '../common/providers/prisma.service';
import type { Role } from '@prisma/client';

/**
 * DeliverableService — business logic for tier deliverable forms and templates.
 *
 * Manager workflow:
 *  1. Create form + rows for a tier  →  status = DRAFT
 *  2. Update rows as needed while DRAFT
 *  3. Send form to organizer          →  status = SENT_TO_ORGANIZER
 *     (emits event → email + in-app notification)
 *
 * Organizer workflow:
 *  4. Fill / update rows             →  status = FILLED
 *  5. Submit                          →  status = SUBMITTED
 *     (in-app notification to manager)
 *
 * Sponsor can view SUBMITTED forms only.
 */
@Injectable()
export class DeliverableService {
  private readonly logger = new Logger(DeliverableService.name);

  constructor(
    private readonly repo: DeliverableRepository,
    private readonly tierRepo: SponsorshipTierRepository,
    private readonly auditLog: AuditLogService,
    private readonly notifications: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) { }

  // ═══════════════════════════════════════════════════════════
  // MANAGER — FORM CRUD
  // ═══════════════════════════════════════════════════════════

  /**
   * Create a deliverable form for a tier (Manager only).
   */
  async createForm(tierId: string, dto: CreateDeliverableFormDto, callerId: string, callerRole: Role) {
    const tier = await this.tierRepo.findById(tierId);
    if (!tier) throw new NotFoundException('Sponsorship tier not found');

    const existing = await this.repo.findFormByTierId(tierId);
    if (existing) throw new BadRequestException('Deliverable form already exists for this tier. Use update instead.');

    const form = await this.repo.createForm(tierId);

    if (dto.rows.length > 0) {
      const rowData = dto.rows.map((r, i) => ({
        category: r.category,
        deliverableName: r.deliverableName,
        brandingType: r.brandingType,
        quantity: r.quantity,
        unit: r.unit,
        otherUnit: r.otherUnit ?? null,
        remarks: r.remarks ?? null,
        sortOrder: r.sortOrder ?? i,
      }));
      await this.repo.createRows(form.id, rowData);
    }

    this.auditLog.log({
      actorId: callerId,
      actorRole: callerRole,
      action: 'deliverable_form.created',
      entityType: 'TierDeliverableForm',
      entityId: form.id,
      metadata: { tierId, rowCount: dto.rows.length },
    });

    this.logger.log(`Deliverable form created for tier ${tierId} by ${callerId}`);
    return this.repo.findFormByTierId(tierId);
  }

  /**
   * Get deliverable form for a tier.
   */
  async getFormByTierId(tierId: string) {
    const form = await this.repo.findFormByTierId(tierId);
    if (!form) throw new NotFoundException('No deliverable form found for this tier');
    return form;
  }

  /**
   * Update rows of a deliverable form (Manager — only while DRAFT).
   */
  async updateForm(tierId: string, dto: UpdateDeliverableFormDto, callerId: string, callerRole: Role) {
    const form = await this.repo.findFormByTierId(tierId);
    if (!form) throw new NotFoundException('No deliverable form found for this tier');

    if (form.status !== 'DRAFT') {
      throw new ForbiddenException('Cannot update form that has already been sent. Status: ' + form.status);
    }

    const rowData = dto.rows.map((r, i) => ({
      category: r.category,
      deliverableName: r.deliverableName,
      brandingType: r.brandingType,
      quantity: r.quantity,
      unit: r.unit,
      otherUnit: r.otherUnit ?? null,
      remarks: r.remarks ?? null,
      sortOrder: r.sortOrder ?? i,
    }));

    const updated = await this.repo.replaceRows(form.id, rowData);

    this.auditLog.log({
      actorId: callerId,
      actorRole: callerRole,
      action: 'deliverable_form.updated',
      entityType: 'TierDeliverableForm',
      entityId: form.id,
      metadata: { tierId, rowCount: dto.rows.length },
    });

    return updated;
  }

  /**
   * Delete a deliverable form (Manager — only while DRAFT).
   */
  async deleteForm(tierId: string, callerId: string, callerRole: Role) {
    const form = await this.repo.findFormByTierId(tierId);
    if (!form) throw new NotFoundException('No deliverable form found for this tier');

    if (form.status !== 'DRAFT') {
      throw new ForbiddenException('Cannot delete form that has been sent');
    }

    await this.repo.deleteForm(form.id);

    this.auditLog.log({
      actorId: callerId,
      actorRole: callerRole,
      action: 'deliverable_form.deleted',
      entityType: 'TierDeliverableForm',
      entityId: form.id,
      metadata: { tierId },
    });

    return { success: true };
  }

  /**
   * Send form to organizer — status → SENT_TO_ORGANIZER.
   * Emits domain event for email + creates in-app notification.
   */
  async sendFormToOrganizer(tierId: string, callerId: string, callerRole: Role) {
    const form = await this.repo.findFormByTierId(tierId);
    if (!form) throw new NotFoundException('No deliverable form found for this tier');

    if (form.status !== 'DRAFT') {
      throw new BadRequestException('Form has already been sent (status: ' + form.status + ')');
    }

    if (!form.rows || form.rows.length === 0) {
      throw new BadRequestException('Cannot send an empty form. Add at least one deliverable row.');
    }

    // Get full form with tier + event + organizer info
    const fullForm = await this.repo.findFormById(form.id);
    const organizerUser = fullForm?.tier?.event?.organizer?.users?.[0];
    if (!organizerUser) {
      throw new BadRequestException('Could not resolve organizer for this event');
    }

    const updated = await this.repo.updateFormStatus(form.id, 'SENT_TO_ORGANIZER');

    const event = fullForm!.tier!.event;
    const organizerUserId = organizerUser.id;
    const organizerEmail = organizerUser.email;

    // In-app notification to organizer
    await this.notifications.create({
      userId: organizerUserId,
      title: 'Deliverable Form Ready',
      message: `A deliverable form for tier "${fullForm!.tier!.tierType}" of event "${event.title}" is ready for you to fill.`,
      severity: 'INFO',
      link: `/organizer/events/${event.id}`,
      entityType: 'TierDeliverableForm',
      entityId: form.id,
    });

    // Emit domain event for email
    if (organizerEmail) {
      this.eventEmitter.emit(
        DELIVERABLES_FORM_SENT_EVENT,
        new DeliverablesFormSentEvent({
          formId: form.id,
          tierId,
          eventId: event.id,
          eventName: event.title,
          tierType: fullForm!.tier!.tierType,
          organizerEmail,
          organizerUserId,
        }),
      );
    }

    this.auditLog.log({
      actorId: callerId,
      actorRole: callerRole,
      action: 'deliverable_form.sent',
      entityType: 'TierDeliverableForm',
      entityId: form.id,
      metadata: { tierId, organizerUserId },
    });

    this.logger.log(`Deliverable form ${form.id} sent to organizer ${organizerUserId}`);
    return updated;
  }

  /**
   * Batch-send ALL DRAFT deliverable forms for an event to the organizer.
   * Transitions all DRAFT forms → SENT_TO_ORGANIZER atomically.
   * Sends ONE in-app notification and ONE email (batch template).
   */
  async sendAllFormsToOrganizer(eventId: string, callerId: string, callerRole: Role) {
    const draftForms = await this.repo.findDraftFormsByEventId(eventId);

    if (draftForms.length === 0) {
      throw new BadRequestException('No draft deliverable forms found for this event.');
    }

    // Validate: all forms must have rows
    const emptyForms = draftForms.filter(f => !f.rows || f.rows.length === 0);
    if (emptyForms.length > 0) {
      const tierNames = emptyForms.map(f => f.tier?.tierType ?? 'Unknown').join(', ');
      throw new BadRequestException(`The following tiers have empty forms: ${tierNames}. Add at least one deliverable row to each.`);
    }

    // Get organizer info from first form
    const firstForm = draftForms[0];
    const event = firstForm.tier?.event;
    const organizerUser = event?.organizer?.users?.[0];

    if (!event || !organizerUser) {
      throw new BadRequestException('Could not resolve organizer for this event');
    }

    const formIds = draftForms.map(f => f.id);
    const organizerUserId = organizerUser.id;
    const organizerEmail = organizerUser.email;

    // Bulk update all forms to SENT_TO_ORGANIZER
    await this.repo.updateManyFormsStatus(formIds, 'SENT_TO_ORGANIZER');

    const tiers = draftForms.map(f => ({
      formId: f.id,
      tierId: f.tier!.id,
      tierType: f.tier!.tierType,
    }));

    // Single in-app notification
    await this.notifications.create({
      userId: organizerUserId,
      title: 'Deliverable Forms Ready',
      message: `Deliverable forms for ${tiers.length} tier${tiers.length > 1 ? 's' : ''} of event "${event.title}" are ready for you to fill.`,
      severity: 'INFO',
      link: `/organizer/events/${event.id}`,
      entityType: 'Event',
      entityId: event.id,
    });

    // Single batch email
    if (organizerEmail) {
      this.eventEmitter.emit(
        DELIVERABLES_BATCH_SENT_EVENT,
        new DeliverablesBatchSentEvent({
          eventId: event.id,
          eventName: event.title,
          organizerEmail,
          organizerUserId,
          tiers,
        }),
      );
    }

    this.auditLog.log({
      actorId: callerId,
      actorRole: callerRole,
      action: 'deliverable_form.batch_sent',
      entityType: 'Event',
      entityId: event.id,
      metadata: { formCount: formIds.length, tierTypes: tiers.map(t => t.tierType) },
    });

    this.logger.log(`${formIds.length} deliverable forms batch-sent to organizer for event ${event.id}`);

    // Return the updated forms
    return this.repo.findFormsByEventId(eventId);
  }

  // ═══════════════════════════════════════════════════════════
  // ORGANIZER — FILL & SUBMIT
  // ═══════════════════════════════════════════════════════════

  /** Check if organizer user owns the event this form belongs to. */
  private isOrganizerOwner(form: any, organizerUserId: string): boolean {
    const users = form?.tier?.event?.organizer?.users;
    return Array.isArray(users) && users.some((u: any) => u.id === organizerUserId);
  }

  /**
   * Get form for organizer (read or fill).
   * Accessible when SENT_TO_ORGANIZER, FILLED, or SUBMITTED.
   * SUBMITTED forms are read-only (enforced by fillForm guard).
   */
  async getFormForOrganizer(formId: string, organizerUserId: string) {
    const form = await this.repo.findFormById(formId);
    if (!form) throw new NotFoundException('Deliverable form not found');

    // Verify the organizer owns this event
    if (!this.isOrganizerOwner(form, organizerUserId)) {
      throw new ForbiddenException('You do not have access to this form');
    }

    if (form.status !== 'SENT_TO_ORGANIZER' && form.status !== 'FILLED' && form.status !== 'SUBMITTED') {
      throw new ForbiddenException('This form is not available for viewing (status: ' + form.status + ')');
    }

    return form;
  }

  /**
   * Get all pending deliverable forms for a given event (organizer view).
   */
  async getPendingFormsForEvent(eventId: string) {
    return this.repo.findPendingFormsByEventId(eventId);
  }

  /**
   * Get all forms for an event regardless of status (manager view).
   */
  async getFormsForEvent(eventId: string) {
    return this.repo.findFormsByEventId(eventId);
  }

  /**
   * Organizer fills/updates the deliverable form rows.
   * Status → FILLED.
   */
  async fillForm(formId: string, dto: FillDeliverableFormDto, organizerUserId: string) {
    const form = await this.repo.findFormById(formId);
    if (!form) throw new NotFoundException('Deliverable form not found');

    if (!this.isOrganizerOwner(form, organizerUserId)) {
      throw new ForbiddenException('You do not have access to this form');
    }

    if (form.status !== 'SENT_TO_ORGANIZER' && form.status !== 'FILLED') {
      throw new ForbiddenException('Cannot fill this form (status: ' + form.status + ')');
    }

    const rowData = dto.rows.map((r, i) => ({
      category: r.category,
      deliverableName: r.deliverableName,
      brandingType: r.brandingType,
      quantity: r.quantity,
      unit: r.unit,
      otherUnit: r.otherUnit ?? null,
      remarks: r.remarks ?? null,
      sortOrder: r.sortOrder ?? i,
    }));

    await this.repo.replaceRows(form.id, rowData);
    const updated = await this.repo.updateFormStatus(form.id, 'FILLED');

    this.auditLog.log({
      actorId: organizerUserId,
      actorRole: 'ORGANIZER' as Role,
      action: 'deliverable_form.filled',
      entityType: 'TierDeliverableForm',
      entityId: form.id,
      metadata: { rowCount: dto.rows.length },
    });

    return updated;
  }

  /**
   * Organizer submits the filled form → SUBMITTED.
   * In-app notification to manager (no email for this direction).
   */
  async submitForm(formId: string, organizerUserId: string) {
    const form = await this.repo.findFormById(formId);
    if (!form) throw new NotFoundException('Deliverable form not found');

    if (!this.isOrganizerOwner(form, organizerUserId)) {
      throw new ForbiddenException('You do not have access to this form');
    }

    if (form.status !== 'FILLED') {
      throw new BadRequestException('Form must be filled before submitting (status: ' + form.status + ')');
    }

    const updated = await this.repo.updateFormStatus(form.id, 'SUBMITTED');

    this.auditLog.log({
      actorId: organizerUserId,
      actorRole: 'ORGANIZER' as Role,
      action: 'deliverable_form.submitted',
      entityType: 'TierDeliverableForm',
      entityId: form.id,
      metadata: {},
    });

    // Notify managers about the submission
    const event = form.tier?.event;
    const tierType = form.tier?.tierType ?? 'Unknown';
    const eventTitle = event?.title ?? 'Unknown Event';
    const eventId = event?.id;

    try {
      const managers = await this.prisma.user.findMany({
        where: { role: { in: ['MANAGER', 'ADMIN', 'SUPER_ADMIN'] }, isActive: true },
        select: { id: true },
      });

      for (const manager of managers) {
        await this.notifications.create({
          userId: manager.id,
          title: 'Deliverable Form Submitted',
          message: `The organizer has submitted the deliverable form for tier "${tierType}" of event "${eventTitle}".`,
          severity: 'INFO',
          link: eventId ? `/manager/verifyEvents/${eventId}` : undefined,
          entityType: 'TierDeliverableForm',
          entityId: form.id,
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to notify managers about form submission: ${err}`);
    }

    this.logger.log(`Deliverable form ${form.id} submitted by organizer ${organizerUserId}`);
    return updated;
  }

  // ═══════════════════════════════════════════════════════════
  // SPONSOR — VIEW
  // ═══════════════════════════════════════════════════════════

  /**
   * View completed deliverables for a tier (Sponsor — SUBMITTED only).
   */
  async getSubmittedFormForSponsor(tierId: string) {
    const form = await this.repo.findFormByTierId(tierId);
    if (!form || form.status !== 'SUBMITTED') {
      throw new NotFoundException('No completed deliverables available for this tier');
    }
    return form;
  }

  // ═══════════════════════════════════════════════════════════
  // MANAGER — COMPARE TIERS
  // ═══════════════════════════════════════════════════════════

  /**
   * Compare deliverables of two tiers side-by-side.
   */
  async compareTiers(tier1Id: string, tier2Id: string) {
    const [form1, form2] = await Promise.all([
      this.repo.findFormByTierId(tier1Id),
      this.repo.findFormByTierId(tier2Id),
    ]);

    return {
      tier1: form1 ? { tierId: tier1Id, status: form1.status, rows: form1.rows } : null,
      tier2: form2 ? { tierId: tier2Id, status: form2.status, rows: form2.rows } : null,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════════

  async createTemplate(dto: CreateDeliverableTemplateDto, callerId: string) {
    const count = await this.repo.countTemplates();
    if (count >= 100) {
      throw new BadRequestException('Maximum of 100 templates reached. Delete an existing template first.');
    }

    const template = await this.repo.createTemplate({
      name: dto.name,
      description: dto.description,
      rows: dto.rows as any,
    });

    this.logger.log(`Template ${template.id} created by ${callerId}`);
    return template;
  }

  async getAllTemplates() {
    return this.repo.findAllTemplates();
  }

  async getTemplateById(id: string) {
    const tpl = await this.repo.findTemplateById(id);
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl;
  }

  async updateTemplate(id: string, dto: UpdateDeliverableTemplateDto, callerId: string) {
    const tpl = await this.repo.findTemplateById(id);
    if (!tpl) throw new NotFoundException('Template not found');

    return this.repo.updateTemplate(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.rows !== undefined && { rows: dto.rows as any }),
    });
  }

  async deleteTemplate(id: string, callerId: string) {
    const tpl = await this.repo.findTemplateById(id);
    if (!tpl) throw new NotFoundException('Template not found');

    await this.repo.deleteTemplate(id);
    this.logger.log(`Template ${id} deleted by ${callerId}`);
    return { success: true };
  }

  /**
   * Apply a template to a tier's deliverable form.
   * Creates the form if it doesn't exist, or replaces rows if DRAFT.
   */
  async applyTemplate(tierId: string, templateId: string, callerId: string, callerRole: Role) {
    const tier = await this.tierRepo.findById(tierId);
    if (!tier) throw new NotFoundException('Sponsorship tier not found');

    const template = await this.repo.findTemplateById(templateId);
    if (!template) throw new NotFoundException('Template not found');

    const templateRows = template.rows as any[];
    if (!Array.isArray(templateRows) || templateRows.length === 0) {
      throw new BadRequestException('Template has no rows');
    }

    let form = await this.repo.findFormByTierId(tierId);

    if (!form) {
      form = await this.repo.createForm(tierId);
    } else if (form.status !== 'DRAFT') {
      throw new ForbiddenException('Cannot apply template — form has already been sent (status: ' + form.status + ')');
    }

    const rowData = templateRows.map((r: any, i: number) => ({
      category: r.category,
      deliverableName: r.deliverableName,
      brandingType: r.brandingType,
      quantity: r.quantity ?? 0,
      unit: r.unit ?? 'PIECES',
      otherUnit: r.otherUnit ?? null,
      remarks: r.remarks ?? null,
      sortOrder: r.sortOrder ?? i,
    }));

    const updated = await this.repo.replaceRows(form.id, rowData);

    this.auditLog.log({
      actorId: callerId,
      actorRole: callerRole,
      action: 'deliverable_form.template_applied',
      entityType: 'TierDeliverableForm',
      entityId: form.id,
      metadata: { tierId, templateId, templateName: template.name },
    });

    return updated;
  }
}
