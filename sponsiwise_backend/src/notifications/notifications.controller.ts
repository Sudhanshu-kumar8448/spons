import { Controller, Get, Patch, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { NotificationsService } from './notifications.service';

/**
 * NotificationsController — user-facing notification endpoints.
 *
 * All endpoints require authentication but no specific role —
 * any authenticated user can read their own notifications.
 *
 *  - GET   /notifications           → paginated list
 *  - GET   /notifications/:id       → single notification
 *  - PATCH /notifications/:id/read  → mark as read
 */
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) { }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayloadWithClaims,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('read') read?: string,
  ) {
    return this.service.findAll(user.sub, user.tenant_id, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      read: read !== undefined ? read === 'true' : undefined,
    });
  }

  @Patch('read-all')
  async markAllAsRead(
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.markAllAsRead(user.sub, user.tenant_id);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.findById(id, user.sub, user.tenant_id);
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.service.markAsRead(id, user.sub, user.tenant_id);
  }
}
