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
import { CompanyService } from './company.service';
import { CreateCompanyDto, UpdateCompanyDto, ListCompaniesQueryDto } from './dto';

/**
 * CompaniesController — HTTP layer for company management.
 */
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companyService: CompanyService) {}

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * POST /companies
   * Create a new company.
   */
  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * GET /companies
   * List companies with optional filters.
   */
  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(@Query() query: ListCompaniesQueryDto) {
    return this.companyService.findAll(query);
  }

  /**
   * GET /companies/:id
   * Get a single company by ID.
   */
  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.companyService.findById(id);
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * PATCH /companies/:id
   * Update company details.
   */
  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.update(id, dto);
  }
}
