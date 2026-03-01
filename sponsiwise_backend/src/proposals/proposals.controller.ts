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
import { Roles, CurrentUser } from '../common/decorators';
import { ProposalService } from './proposal.service';
import { CreateProposalDto, UpdateProposalDto, ListProposalsQueryDto } from './dto';
import type { JwtPayloadWithClaims } from '../auth/interfaces';

/**
 * ProposalsController — HTTP layer for proposal management.
 *
 * RBAC rules:
 *  - POST   /proposals          → ADMIN / SUPER_ADMIN
 *  - GET    /proposals          → USER, ADMIN, SUPER_ADMIN
 *  - GET    /proposals/:id      → USER, ADMIN, SUPER_ADMIN
 *  - PATCH  /proposals/:id      → ADMIN, SUPER_ADMIN
 *
 * Status transitions are validated by the service layer.
 */
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalService: ProposalService) {}

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async create(
    @Body() dto: CreateProposalDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.proposalService.create(dto, user.sub, user.role);
  }

  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(@Query() query: ListProposalsQueryDto) {
    return this.proposalService.findAll(query);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.proposalService.findById(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProposalDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.proposalService.update(id, dto, user.sub, user.role);
  }
}
