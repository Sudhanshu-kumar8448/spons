import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/providers/prisma.service';
import type { NewsletterSubscriber } from '@prisma/client';

@Injectable()
export class NewsletterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(email: string): Promise<NewsletterSubscriber> {
    return this.prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email },
      update: { isActive: true, unsubscribedAt: null },
    });
  }

  async unsubscribe(email: string): Promise<NewsletterSubscriber | null> {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });
    if (!existing) return null;
    return this.prisma.newsletterSubscriber.update({
      where: { email },
      data: { isActive: false, unsubscribedAt: new Date() },
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    isActive?: boolean;
  }): Promise<{ data: NewsletterSubscriber[]; total: number }> {
    const where = params?.isActive !== undefined ? { isActive: params.isActive } : {};
    const [data, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        skip: params?.skip,
        take: params?.take,
        orderBy: { subscribedAt: 'desc' },
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);
    return { data, total };
  }

  async isSubscribed(email: string): Promise<boolean> {
    const sub = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
      select: { isActive: true },
    });
    return sub?.isActive ?? false;
  }
}
