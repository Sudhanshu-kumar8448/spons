import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { DeliverableService } from './deliverable.service';
import { CreateDeliverableFormDto } from './dto/create-deliverable-form.dto';
import { UpdateDeliverableFormDto } from './dto/update-deliverable-form.dto';
import { FillDeliverableFormDto } from './dto/fill-deliverable-form.dto';
import {
  CreateDeliverableTemplateDto,
  UpdateDeliverableTemplateDto,
} from './dto/deliverable-template.dto';

/**
 * DeliverablesController — multi-role endpoint definitions.
 *
 * Manager endpoints (prefix: manager/):
 *   POST   manager/tiers/:tierId/deliverables           → create form
 *   GET    manager/tiers/:tierId/deliverables           → get form
 *   PUT    manager/tiers/:tierId/deliverables           → update rows
 *   DELETE manager/tiers/:tierId/deliverables           → delete form
 *   POST   manager/tiers/:tierId/deliverables/send      → send to organizer
 *   POST   manager/tiers/:tierId/deliverables/apply-template/:templateId → apply template
 *   GET    manager/events/:eventId/deliverables/compare → compare tiers
 *   GET    manager/events/:eventId/deliverables         → all forms for event
 *
 * Template endpoints (manager only):
 *   POST   manager/deliverable-templates
 *   GET    manager/deliverable-templates
 *   GET    manager/deliverable-templates/:id
 *   PUT    manager/deliverable-templates/:id
 *   DELETE manager/deliverable-templates/:id
 *
 * Organizer endpoints:
 *   GET    organizer/deliverables/:formId               → get form
 *   PUT    organizer/deliverables/:formId               → fill rows
 *   POST   organizer/deliverables/:formId/submit        → submit
 *   GET    organizer/events/:eventId/deliverables       → pending forms
 *
 * Sponsor endpoints:
 *   GET    sponsor/tiers/:tierId/deliverables           → view SUBMITTED
 */
@Controller()
@UseGuards(AuthGuard, RoleGuard)
export class DeliverablesController {
  constructor(private readonly service: DeliverableService) { }

  // ═══════════════════════════════════════════════════════════════
  // MANAGER — FORM CRUD
  // ═══════════════════════════════════════════════════════════════

  @Post('manager/tiers/:tierId/deliverables')
  @Roles(Role.MANAGER, Role.ADMIN)
  async createForm(
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @Body() dto: CreateDeliverableFormDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.createForm(tierId, dto, user.sub, user.role);
  }

  @Get('manager/tiers/:tierId/deliverables')
  @Roles(Role.MANAGER, Role.ADMIN)
  async getForm(@Param('tierId', ParseUUIDPipe) tierId: string) {
    return this.service.getFormByTierId(tierId);
  }

  @Put('manager/tiers/:tierId/deliverables')
  @Roles(Role.MANAGER, Role.ADMIN)
  async updateForm(
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @Body() dto: UpdateDeliverableFormDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.updateForm(tierId, dto, user.sub, user.role);
  }

  @Delete('manager/tiers/:tierId/deliverables')
  @Roles(Role.MANAGER, Role.ADMIN)
  async deleteForm(
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.deleteForm(tierId, user.sub, user.role);
  }

  @Post('manager/tiers/:tierId/deliverables/send')
  @Roles(Role.MANAGER, Role.ADMIN)
  async sendToOrganizer(
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.sendFormToOrganizer(tierId, user.sub, user.role);
  }

  @Post('manager/tiers/:tierId/deliverables/apply-template/:templateId')
  @Roles(Role.MANAGER, Role.ADMIN)
  async applyTemplate(
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.applyTemplate(tierId, templateId, user.sub, user.role);
  }

  // ─── MANAGER — EVENT-LEVEL ─────────────────────────────────────

  @Get('manager/events/:eventId/deliverables')
  @Roles(Role.MANAGER, Role.ADMIN)
  async getEventDeliverables(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.service.getFormsForEvent(eventId);
  }

  @Get('manager/events/:eventId/deliverables/compare')
  @Roles(Role.MANAGER, Role.ADMIN)
  async compareTiers(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query('tier1') tier1Id: string,
    @Query('tier2') tier2Id: string,
  ) {
    if (!tier1Id || !tier2Id) {
      throw new Error('Both tier1 and tier2 query parameters are required');
    }
    return this.service.compareTiers(tier1Id, tier2Id);
  }

  @Post('manager/events/:eventId/deliverables/send-all')
  @Roles(Role.MANAGER, Role.ADMIN)
  async sendAllToOrganizer(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.sendAllFormsToOrganizer(eventId, user.sub, user.role);
  }

  // ═══════════════════════════════════════════════════════════════
  // MANAGER — TEMPLATES
  // ═══════════════════════════════════════════════════════════════

  @Post('manager/deliverable-templates')
  @Roles(Role.MANAGER, Role.ADMIN)
  async createTemplate(
    @Body() dto: CreateDeliverableTemplateDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.createTemplate(dto, user.sub);
  }

  @Get('manager/deliverable-templates')
  @Roles(Role.MANAGER, Role.ADMIN)
  async getAllTemplates() {
    return this.service.getAllTemplates();
  }

  @Get('manager/deliverable-templates/:id')
  @Roles(Role.MANAGER, Role.ADMIN)
  async getTemplateById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getTemplateById(id);
  }

  @Put('manager/deliverable-templates/:id')
  @Roles(Role.MANAGER, Role.ADMIN)
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliverableTemplateDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.updateTemplate(id, dto, user.sub);
  }

  @Delete('manager/deliverable-templates/:id')
  @Roles(Role.MANAGER, Role.ADMIN)
  async deleteTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.deleteTemplate(id, user.sub);
  }

  // ═══════════════════════════════════════════════════════════════
  // ORGANIZER — FILL & SUBMIT
  // ═══════════════════════════════════════════════════════════════

  @Get('organizer/events/:eventId/deliverables')
  @Roles(Role.ORGANIZER)
  async getOrganizerEventDeliverables(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.service.getPendingFormsForEvent(eventId);
  }

  @Get('organizer/deliverables/:formId')
  @Roles(Role.ORGANIZER)
  async getOrganizerForm(
    @Param('formId', ParseUUIDPipe) formId: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.getFormForOrganizer(formId, user.sub);
  }

  @Put('organizer/deliverables/:formId')
  @Roles(Role.ORGANIZER)
  async fillForm(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: FillDeliverableFormDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.fillForm(formId, dto, user.sub);
  }

  @Post('organizer/deliverables/:formId/submit')
  @Roles(Role.ORGANIZER)
  async submitForm(
    @Param('formId', ParseUUIDPipe) formId: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.submitForm(formId, user.sub);
  }

  // ═══════════════════════════════════════════════════════════════
  // SPONSOR — VIEW COMPLETED DELIVERABLES
  // ═══════════════════════════════════════════════════════════════

  @Get('sponsor/tiers/:tierId/deliverables')
  @Roles(Role.SPONSOR)
  async getSponsorTierDeliverables(
    @Param('tierId', ParseUUIDPipe) tierId: string,
  ) {
    return this.service.getSubmittedFormForSponsor(tierId);
  }
}
