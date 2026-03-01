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
import { OrganizerService } from './organizer.service';
import { CreateOrganizerDto, UpdateOrganizerDto, ListOrganizersQueryDto } from './dto';

/**
 * OrganizersController — HTTP layer for organizer management.
 */
@Controller('organizers')
export class OrganizersController {
  constructor(private readonly organizerService: OrganizerService) { }

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * POST /organizers
   * Create a new organizer.
   */
  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async create(@Body() dto: CreateOrganizerDto) {
    return this.organizerService.create(dto);
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * GET /organizers
   * List organizers with optional filters.
   */
  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(@Query() query: ListOrganizersQueryDto) {
    return this.organizerService.findAll(query);
  }

  /**
   * GET /organizers/:id
   * Get a single organizer by ID.
   */
  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizerService.findById(id);
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * PATCH /organizers/:id
   * Update organizer details.
   */
  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizerDto,
  ) {
    return this.organizerService.update(id, dto);
  }

  // ─── DELETE ──────────────────────────────────────────────

  /**
   * DELETE /organizers/:id
   * Soft delete an organizer.
   */
  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizerService.remove(id);
  }
}
