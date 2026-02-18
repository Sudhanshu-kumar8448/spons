import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Role } from '@prisma/client';

/**
 * DTO for updating a user within a tenant.
 *
 * Mutable fields only — email and password changes are
 * handled separately (future: profile / auth flows).
 * tenantId is immutable (users cannot cross tenants).
 */
export class UpdateUserDto {
  @IsOptional()
  @IsEnum(Role, {
    message: `Role must be one of: ${Object.values(Role).join(', ')}`,
  })
  role?: Role;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
