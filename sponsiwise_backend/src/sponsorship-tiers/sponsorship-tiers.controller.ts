import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SponsorshipTierService } from './sponsorship-tier.service';
import { S3Service } from '../common/providers/s3.service';
import { CreateSponsorshipTierDto, UpdateSponsorshipTierDto } from './dto/sponsorship-tier.dto';
import { AuthGuard } from '../common/guards';
import { RoleGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Controller('sponsorship-tiers')
@UseGuards(AuthGuard, RoleGuard)
export class SponsorshipTierController {
  constructor(
    private readonly tierService: SponsorshipTierService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Create a new tier for an event
   */
  @Post('event/:eventId')
  @Roles(Role.ORGANIZER, Role.MANAGER, Role.ADMIN)
  async create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateSponsorshipTierDto,
    @Request() req: any,
  ) {
    return this.tierService.create(
      eventId,
      dto,
      req.user.role,
      req.user.tenantId,
      req.user.id,
    );
  }

  /**
   * Create multiple tiers at once
   */
  @Post('event/:eventId/bulk')
  @Roles(Role.ORGANIZER, Role.MANAGER, Role.ADMIN)
  async createBulk(
    @Param('eventId') eventId: string,
    @Body() body: { tiers: CreateSponsorshipTierDto[] },
    @Request() req: any,
  ) {
    return this.tierService.createBulk(
      eventId,
      body.tiers,
      req.user.role,
      req.user.tenantId,
      req.user.id,
    );
  }

  /**
   * Get all tiers for an event
   */
  @Get('event/:eventId')
  async findByEvent(@Param('eventId') eventId: string, @Request() req: any) {
    return this.tierService.findByEventId(
      eventId,
      req.user?.role || Role.USER,
      req.user?.tenantId,
    );
  }

  /**
   * Get available tiers for sponsors (public view)
   */
  @Get('event/:eventId/available')
  async findAvailable(@Param('eventId') eventId: string) {
    return this.tierService.findAvailableForEvent(eventId);
  }

  /**
   * Get a single tier by ID
   */
  @Get(':tierId')
  async findById(@Param('tierId') tierId: string, @Request() req: any) {
    return this.tierService.findById(
      tierId,
      req.user?.role || Role.USER,
      req.user?.tenantId,
    );
  }

  /**
   * Update a tier
   */
  @Put(':tierId')
  @Roles(Role.ORGANIZER, Role.MANAGER, Role.ADMIN)
  async update(
    @Param('tierId') tierId: string,
    @Body() dto: UpdateSponsorshipTierDto,
    @Request() req: any,
  ) {
    return this.tierService.update(
      tierId,
      dto,
      req.user.role,
      req.user.tenantId,
      req.user.id,
    );
  }

  /**
   * Lock all tiers for an event (manager approval)
   */
  @Post('event/:eventId/lock')
  @Roles(Role.MANAGER, Role.ADMIN)
  async lockAll(
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.tierService.lockAllTiers(
      eventId,
      req.user.role,
      req.user.tenantId,
      req.user.id,
    );
  }

  /**
   * Unlock all tiers for an event (manager only)
   */
  @Post('event/:eventId/unlock')
  @Roles(Role.MANAGER, Role.ADMIN)
  async unlockAll(
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.tierService.unlockAllTiers(
      eventId,
      req.user.role,
      req.user.tenantId,
      req.user.id,
    );
  }

  /**
   * Delete a tier
   */
  @Delete(':tierId')
  @Roles(Role.ORGANIZER, Role.MANAGER, Role.ADMIN)
  async delete(@Param('tierId') tierId: string, @Request() req: any) {
    return this.tierService.delete(
      tierId,
      req.user.role,
      req.user.tenantId,
      req.user.id,
    );
  }

  /**
   * Upload PPT deck for an event
   */
  @Post('event/:eventId/ppt-deck')
  @Roles(Role.ORGANIZER, Role.MANAGER, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadPptDeck(
    @Param('eventId') eventId: string,
    @UploadedFile() file: MulterFile,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/pdf',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only PPT and PDF files are allowed');
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 50MB limit');
    }

    const result = await this.s3Service.uploadPptDeck(
      eventId,
      file.buffer,
      file.originalname,
    );

    return {
      url: result.url,
      key: result.key,
      filename: file.originalname,
      size: file.size,
      contentType: file.mimetype,
    };
  }
}

