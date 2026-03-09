import {
  Controller, Post, Delete, Get, Body, Query, UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { NewsletterService } from './newsletter.service';

// Public endpoint — no auth required
@Controller('public/newsletter')
export class PublicNewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  async subscribe(@Body() body: { email: string }) {
    return this.newsletterService.subscribe(body.email);
  }

  @Post('unsubscribe')
  async unsubscribe(@Body() body: { email: string }) {
    return this.newsletterService.unsubscribe(body.email);
  }
}

// Manager endpoint — auth required
@Controller('newsletter')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Get('subscribers')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.newsletterService.findAll(
      Number(page) || 1,
      Number(limit) || 50,
    );
  }
}
