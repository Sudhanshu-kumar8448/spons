import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/providers/prisma.service';
import type { DeliverableFormStatus } from '@prisma/client';

interface RowInput {
  category: string;
  deliverableName: string;
  brandingType: string;
  quantity: number;
  unit: string;
  otherUnit?: string | null;
  remarks?: string | null;
  sortOrder?: number;
}

/**
 * DeliverableRepository — data-access layer for tier deliverable forms,
 * rows, and global templates.
 */
@Injectable()
export class DeliverableRepository {
  constructor(private readonly prisma: PrismaService) { }

  // ─── FORMS ──────────────────────────────────────────────────

  async createForm(tierId: string) {
    return this.prisma.tierDeliverableForm.create({
      data: { tierId, status: 'DRAFT' },
      include: { rows: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findFormByTierId(tierId: string) {
    return this.prisma.tierDeliverableForm.findUnique({
      where: { tierId },
      include: { rows: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findFormById(formId: string) {
    return this.prisma.tierDeliverableForm.findUnique({
      where: { id: formId },
      include: {
        rows: { orderBy: { sortOrder: 'asc' } },
        tier: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                organizerId: true,
                organizer: {
                  select: {
                    id: true,
                    users: {
                      where: { role: 'ORGANIZER', isActive: true },
                      select: { id: true, email: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async updateFormStatus(formId: string, status: DeliverableFormStatus) {
    return this.prisma.tierDeliverableForm.update({
      where: { id: formId },
      data: { status },
      include: { rows: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async deleteForm(formId: string) {
    return this.prisma.tierDeliverableForm.delete({ where: { id: formId } });
  }

  // ─── ROWS ──────────────────────────────────────────────────

  async createRows(formId: string, rows: RowInput[]) {
    const data = rows.map((r, i) => ({
      ...r,
      formId,
      sortOrder: r.sortOrder ?? i,
    }));
    return this.prisma.tierDeliverableRow.createMany({ data: data as any });
  }

  async deleteRowsByFormId(formId: string) {
    return this.prisma.tierDeliverableRow.deleteMany({ where: { formId } });
  }

  /**
   * Replace all rows for a form atomically — delete old, create new.
   */
  async replaceRows(formId: string, rows: RowInput[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.tierDeliverableRow.deleteMany({ where: { formId } });
      const data = rows.map((r, i) => ({
        ...r,
        formId,
        sortOrder: r.sortOrder ?? i,
      }));
      await tx.tierDeliverableRow.createMany({ data: data as any });
      return tx.tierDeliverableForm.findUnique({
        where: { id: formId },
        include: { rows: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  // ─── FORMS BY EVENT ────────────────────────────────────────

  async findFormsByEventId(eventId: string) {
    return this.prisma.tierDeliverableForm.findMany({
      where: { tier: { eventId } },
      include: {
        rows: { orderBy: { sortOrder: 'asc' } },
        tier: { select: { id: true, tierType: true, askingPrice: true, customName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Find forms that are SENT_TO_ORGANIZER, FILLED, or SUBMITTED for a given event.
   * Used by organizer endpoints to see all forms relevant to them.
   */
  async findPendingFormsByEventId(eventId: string) {
    return this.prisma.tierDeliverableForm.findMany({
      where: {
        tier: { eventId },
        status: { in: ['SENT_TO_ORGANIZER', 'FILLED', 'SUBMITTED'] },
      },
      include: {
        rows: { orderBy: { sortOrder: 'asc' } },
        tier: { select: { id: true, tierType: true, askingPrice: true, customName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Find all DRAFT deliverable forms for a given event.
   * Used by batch-send operation.
   */
  async findDraftFormsByEventId(eventId: string) {
    return this.prisma.tierDeliverableForm.findMany({
      where: {
        tier: { eventId },
        status: 'DRAFT',
      },
      include: {
        rows: { orderBy: { sortOrder: 'asc' } },
        tier: {
          select: {
            id: true,
            tierType: true,
            askingPrice: true,
            customName: true,
            event: {
              select: {
                id: true,
                title: true,
                organizer: {
                  select: {
                    id: true,
                    users: {
                      where: { role: 'ORGANIZER', isActive: true },
                      select: { id: true, email: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Bulk update status for multiple forms atomically.
   */
  async updateManyFormsStatus(formIds: string[], status: DeliverableFormStatus) {
    return this.prisma.tierDeliverableForm.updateMany({
      where: { id: { in: formIds } },
      data: { status },
    });
  }

  // ─── TEMPLATES ──────────────────────────────────────────────

  async createTemplate(data: { name: string; description?: string; rows: any }) {
    return this.prisma.deliverableTemplate.create({ data });
  }

  async findAllTemplates() {
    return this.prisma.deliverableTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  async findTemplateById(id: string) {
    return this.prisma.deliverableTemplate.findUnique({ where: { id } });
  }

  async updateTemplate(id: string, data: Partial<{ name: string; description: string; rows: any }>) {
    return this.prisma.deliverableTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: string) {
    return this.prisma.deliverableTemplate.delete({ where: { id } });
  }

  async countTemplates() {
    return this.prisma.deliverableTemplate.count();
  }
}
