import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { EventService } from './event.service';
import { CreateEventDto, UpdateEventDto, ListEventsQueryDto } from './dto';

/**
 * EventsController — HTTP layer for event management.
 */
@Controller('events')
export class EventsController {
  constructor(private readonly eventService: EventService) { }

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * POST /events
   * Create a new event under an Organizer.
   * Body must include organizerId.
   */
  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN, Role.SUPER_ADMIN)
  async create(@Body() dto: CreateEventDto) {
    return this.eventService.create(dto);
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * GET /events
   * List events with optional filters (status, organizerId, isActive).
   */
  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(@Query() query: ListEventsQueryDto) {
    return this.eventService.findAll(query);
  }

  /**
   * GET /events/:id
   * Get a single event by ID.
   */
  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventService.findById(id);
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * PATCH /events/:id
   * Update event details.
   */
  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventService.update(id, dto);
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
