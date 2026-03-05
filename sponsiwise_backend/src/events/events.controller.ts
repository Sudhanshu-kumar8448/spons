import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { EventService } from './event.service';
import {  ListEventsQueryDto } from './dto';

/**
 * EventsController — HTTP layer for event management.
 */
@Controller('events')
export class EventsController {
  constructor(private readonly eventService: EventService) { }

  
  // ─── READ ────────────────────────────────────────────────

  /**
   * GET /events
   * List events with optional filters (status, organizerId, isActive).
   */
  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(@Query() query: ListEventsQueryDto) {
    return this.eventService.findAll(query);
  }

  /**
   * GET /events/:id
   * Get a single event by ID.
   */
  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventService.findById(id);
  }



  // ─── DELETE ──────────────────────────────────────────────

  /**
   * DELETE /events/:id
   * Soft delete an event.
   */
  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventService.remove(id);
  }
}
