import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UserRepository } from './user.repository';
import type { SafeUser } from './user.repository';
import { UpdateUserDto, ListUsersQueryDto } from './dto';

/**
 * UserService — business logic for user management.
 *
 * Role checks remain for authorization (ADMIN, SUPER_ADMIN, etc.)
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  // ─── READ ────────────────────────────────────────────────

  /**
   * Get the authenticated user's own profile.
   */
  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get a single user by ID.
   */
  async findById(targetUserId: string): Promise<SafeUser> {
    const user = await this.userRepository.findById(targetUserId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * List users with optional filters.
   */
  async findAll(
    query: ListUsersQueryDto,
  ): Promise<{
    data: SafeUser[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const result = await this.userRepository.findAll({
      skip,
      take: limit,
      role: query.role,
      isActive: query.isActive,
    });

    return { ...result, page, limit };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update a user.
   * - Non-SUPER_ADMIN cannot set SUPER_ADMIN role
   */
  async update(
    targetUserId: string,
    dto: UpdateUserDto,
    callerRole: Role,
  ): Promise<SafeUser> {
    // Prevent non-SUPER_ADMIN from escalating to SUPER_ADMIN
    if (callerRole !== Role.SUPER_ADMIN && dto.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can assign SUPER_ADMIN role');
    }

    // Ensure target user exists
    await this.findById(targetUserId);

    const data = {
      ...(dto.role !== undefined && { role: dto.role }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    const user = await this.userRepository.updateById(targetUserId, data);

    this.logger.log(`User ${targetUserId} updated by ${callerRole}`);
    return user;
  }
}
