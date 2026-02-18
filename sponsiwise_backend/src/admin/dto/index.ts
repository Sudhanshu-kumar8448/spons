import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// ─── Pagination ────────────────────────────────────────────────────────

export class AdminPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  page_size: number = 20;
}

// ─── GET /admin/users ──────────────────────────────────────────────────

export class AdminUsersQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string; // "active" | "inactive"

  @IsOptional()
  @IsString()
  search?: string;
}

// ─── PATCH /admin/users/:id/role ───────────────────────────────────────

/**
 * Assignable roles — SUPER_ADMIN is intentionally excluded.
 * Validated at the service layer as well for defence-in-depth.
 */
export enum AssignableRole {
  USER = 'USER',
  SPONSOR = 'SPONSOR',
  ORGANIZER = 'ORGANIZER',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export class UpdateRoleDto {
  @IsEnum(AssignableRole, {
    message: `role must be one of: ${Object.values(AssignableRole).join(', ')}`,
  })
  role!: AssignableRole;
}

// ─── PATCH /admin/users/:id/status ─────────────────────────────────────

export enum UserStatusValue {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateStatusDto {
  @IsEnum(UserStatusValue, {
    message: 'status must be one of: active, inactive',
  })
  status!: UserStatusValue;
}
