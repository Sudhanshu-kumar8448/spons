import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { SponsorshipService } from './sponsorship.service';
import { CreateSponsorshipDto, UpdateSponsorshipDto, ListSponsorshipsQueryDto } from './dto';

/**
 * SponsorshipsController — HTTP layer for sponsorship management.
 *
 * RBAC rules:
 *  - POST   /sponsorships          → ADMIN, SUPER_ADMIN
 *  - GET    /sponsorships          → USER, ADMIN, SUPER_ADMIN
 *  - GET    /sponsorships/:id      → USER, ADMIN, SUPER_ADMIN
 *  - PATCH  /sponsorships/:id      → ADMIN, SUPER_ADMIN
 */
@Controller('sponsorships')
export class SponsorshipsController {
  constructor(private readonly sponsorshipService: SponsorshipService) {}

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async create(@Body() dto: CreateSponsorshipDto) {
    return this.sponsorshipService.create(dto);
  }

  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(@Query() query: ListSponsorshipsQueryDto) {
    return this.sponsorshipService.findAll(query);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.sponsorshipService.findById(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSponsorshipDto,
  ) {
    return this.sponsorshipService.update(id, dto);
  }
}
