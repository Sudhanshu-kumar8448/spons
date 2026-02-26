import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { Role, EventStatus } from '@prisma/client';
import { AuthGuard, RoleGuard, TenantGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import { S3Service } from '../common/providers/s3.service';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { GLOBAL_TENANT_ID } from '../common/constants/global-tenant.constants';

class GeneratePresignedUrlDto {
  @IsString()
  fileName!: string;

  @IsString()
  fileType!: string;

  @IsOptional()
  @IsString()
  folder?: string;
}

class GeneratePptPresignedUrlDto {
  @IsString()
  fileName!: string;

  @IsString()
  fileType!: string;

  @IsOptional()
  @IsString()
  eventId?: string;
}

/**
 * UploadController - Handles file upload operations
 * Uses presigned URL pattern for direct S3 upload
 */
@Controller('upload')
@UseGuards(AuthGuard, TenantGuard)
export class UploadController {
  constructor(private readonly s3Service: S3Service) { }

  /**
   * POST /upload/presigned-url
   * Generate a presigned URL for direct S3 upload
   */
  @Post('presigned-url')
  async generatePresignedUrl(
    @Body() dto: GeneratePresignedUrlDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    const timestamp = Date.now();
    const safeFileName = dto.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const folder = dto.folder || 'uploads';
    const key = `${folder}/${user.tenant_id}/${timestamp}-${safeFileName}`;

    const uploadUrl = await this.s3Service.generatePresignedUploadUrl(
      key,
      dto.fileType,
      3600,
    );

    return {
      uploadUrl,
      fileUrl: this.s3Service.getPublicUrl(key),
      key,
      expiresIn: 3600,
    };
  }

  /**
   * POST /upload/presigned-url/ppt-deck
   * Generate a presigned URL specifically for PPT deck uploads
   */
  @Post('presigned-url/ppt-deck')
  async generatePptPresignedUrl(
    @Body() dto: GeneratePptPresignedUrlDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    const timestamp = Date.now();
    const safeFileName = dto.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    let key: string;
    if (dto.eventId) {
      key = `events/${dto.eventId}/ppt-deck/${timestamp}-${safeFileName}`;
    } else {
      key = `ppt-decks/${user.tenant_id}/${timestamp}-${safeFileName}`;
    }

    const uploadUrl = await this.s3Service.generatePresignedUploadUrl(
      key,
      dto.fileType,
      3600,
    );

    return {
      uploadUrl,
      fileUrl: this.s3Service.getPublicUrl(key),
      key,
      expiresIn: 3600,
    };
  }

  /**
   * POST /upload/presigned-url/logo
   * Generate a presigned URL for logo uploads
   */
  @Post('presigned-url/logo')
  async generateLogoPresignedUrl(
    @Body() dto: GeneratePresignedUrlDto & { entityType?: string; entityId?: string },
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    const timestamp = Date.now();
    const safeFileName = dto.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    let key: string;
    if (dto.entityType && dto.entityId) {
      key = `${dto.entityType}/${dto.entityId}/logo/${timestamp}-${safeFileName}`;
    } else {
      key = `logos/${user.tenant_id}/${timestamp}-${safeFileName}`;
    }

    const uploadUrl = await this.s3Service.generatePresignedUploadUrl(
      key,
      dto.fileType,
      3600,
    );

    return {
      uploadUrl,
      fileUrl: this.s3Service.getPublicUrl(key),
      key,
      expiresIn: 3600,
    };
  }

  /**
   * POST /upload/presigned-url/download
   * Generate a presigned URL for downloading/viewing a file
   */
  @Post('presigned-url/download')
  async generateDownloadUrl(
    @Body() body: { key: string },
  ) {
    const downloadUrl = await this.s3Service.generatePresignedDownloadUrl(
      body.key,
      3600,
    );

    return {
      downloadUrl,
      expiresIn: 3600,
    };
  }

  /**
   * POST /upload/delete
   * Delete a file from S3/MinIO
   */
  @Post('delete')
  async deleteFile(
    @Body() body: { key: string },
  ) {
    await this.s3Service.deleteObject(body.key);
    return { success: true };
  }
}
