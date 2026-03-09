import {
  Injectable, BadRequestException, Logger,
} from '@nestjs/common';
import { NewsletterRepository } from './newsletter.repository';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(private readonly repo: NewsletterRepository) {}

  async subscribe(email: string) {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('A valid email address is required');
    }

    const normalised = email.trim().toLowerCase();
    const subscriber = await this.repo.subscribe(normalised);
    this.logger.log(`Newsletter subscription: ${normalised}`);
    return { subscribed: true, email: subscriber.email };
  }

  async unsubscribe(email: string) {
    const normalised = email.trim().toLowerCase();
    const result = await this.repo.unsubscribe(normalised);
    if (!result) {
      throw new BadRequestException('Email not found in subscriptions');
    }
    this.logger.log(`Newsletter unsubscription: ${normalised}`);
    return { subscribed: false, email: normalised };
  }

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return this.repo.findAll({ skip, take: limit, isActive: true });
  }
}
