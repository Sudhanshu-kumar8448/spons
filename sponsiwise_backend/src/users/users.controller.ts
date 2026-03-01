import {
  Controller,
  Get,
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
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { UserService } from './user.service';
import { UpdateUserDto, ListUsersQueryDto } from './dto';

/**
 * UsersController — HTTP layer for user management.
 *
 * RBAC rules:
 *  - GET    /users/me          → any authenticated user (own profile)
 *  - GET    /users             → ADMIN / SUPER_ADMIN
 *  - GET    /users/:id         → ADMIN / SUPER_ADMIN
 *  - PATCH  /users/:id         → ADMIN / SUPER_ADMIN
 */
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  // ─── READ ────────────────────────────────────────────────

  /**
   * GET /users/me
   * Any authenticated user can view their own profile.
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: JwtPayloadWithClaims) {
    return this.userService.getMe(user.sub);
  }

  /**
   * GET /users
   * List users with optional filters.
   */
  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(@Query() query: ListUsersQueryDto) {
    return this.userService.findAll(query);
  }

  /**
   * GET /users/:id
   * Get a single user by ID.
   */
  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findById(id);
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * PATCH /users/:id
   * Update a user's role or isActive status.
   */
  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.userService.update(id, dto, user.role);
  }
}
