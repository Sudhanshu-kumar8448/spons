
import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadResult {
  url: string;
  key: string;
}

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly publicUrl: string;
  private readonly isLocal: boolean;

  constructor() {
    this.region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
    this.bucketName = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || 'sponsiwise';
    this.publicUrl = process.env.S3_PUBLIC_URL || `http://localhost:9000/${this.bucketName}`;

    const accessKeyId = process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
    const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';

    // Detect if using a custom S3-compatible provider (R2, MinIO, etc.)
    const hasCustomEndpoint = !!process.env.S3_ENDPOINT;
    this.isLocal = hasCustomEndpoint
      ? endpoint.includes('localhost') || endpoint.includes('127.0.0.1')
      : true;

    if (!accessKeyId || !secretAccessKey) {
      this.logger.error('❌ S3 credentials not configured! Set S3_ACCESS_KEY and S3_SECRET_KEY in .env');
    }

    this.logger.log(`S3Service initializing...`);
    this.logger.log(`  Bucket: ${this.bucketName}`);
    this.logger.log(`  Region: ${this.region}`);
    this.logger.log(`  Endpoint: ${endpoint}`);
    this.logger.log(`  CustomEndpoint: ${hasCustomEndpoint}`);
    this.logger.log(`  AccessKey: ${accessKeyId.substring(0, 4)}...`);

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Always pass endpoint & forcePathStyle for custom S3-compatible providers
      // (Cloudflare R2, MinIO, etc.) — not just localhost
      ...(hasCustomEndpoint && {
        endpoint,
        forcePathStyle: true,
      }),
    });

    this.logger.log(`S3Service initialized successfully`);
  }

  async onModuleInit() {
    // Ensure bucket exists on startup (only for local/MinIO, not cloud providers)
    if (this.isLocal) {
      await this.ensureBucketExists();
    }
    // Always configure CORS so presigned uploads work from browser
    await this.ensureCorsConfigured();
  }

  /**
   * Ensure CORS is configured on the bucket so browser presigned uploads work.
   */
  private async ensureCorsConfigured(): Promise<void> {
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:3001',
      process.env.FRONTEND_URL || 'http://localhost:3001',
    ].filter((v, i, a) => a.indexOf(v) === i); // dedupe

    try {
      // Check if CORS is already configured
      const existing = await this.s3Client.send(
        new GetBucketCorsCommand({ Bucket: this.bucketName }),
      );
      if (existing.CORSRules && existing.CORSRules.length > 0) {
        this.logger.log(`CORS already configured on bucket ${this.bucketName}`);
        return;
      }
    } catch {
      // No CORS config yet — this is expected, we'll set it below
    }

    try {
      await this.s3Client.send(
        new PutBucketCorsCommand({
          Bucket: this.bucketName,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: allowedOrigins,
                AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
      this.logger.log(`✅ CORS configured on bucket ${this.bucketName} for origins: ${allowedOrigins.join(', ')}`);
    } catch (error: any) {
      this.logger.warn(`⚠️ Could not set CORS on bucket ${this.bucketName}: ${error.message}`);
      this.logger.warn(`   You may need to configure CORS manually in Cloudflare R2 dashboard.`);
    }
  }

  /**
   * Ensure the S3 bucket exists, create it if it doesn't
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      // Check if bucket exists
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(`Bucket ${this.bucketName} already exists`);
    } catch (error: any) {
      // Log full error details for debugging
      this.logger.warn(`HeadBucket failed: ${error.name} - ${error.message}`);
      this.logger.warn(`HTTP Status: ${error.$metadata?.httpStatusCode}`);

      // Check for credential errors
      if (error.$metadata?.httpStatusCode === 403 || error.name === 'Forbidden' || error.name === 'InvalidAccessKeyId') {
        this.logger.error(`❌ S3/MinIO credentials are invalid!`);
        this.logger.error(`   Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.`);
        this.logger.error(`   If using MinIO, ensure the credentials match your MinIO server settings.`);
        this.logger.error(`   Current endpoint: ${process.env.S3_ENDPOINT || 'http://localhost:9000'}`);
        return; // Don't try to create bucket if credentials are wrong
      }

      if (error.name === 'NotFound' || error.name === 'NoSuchBucket' || error.$metadata?.httpStatusCode === 404) {
        // Bucket doesn't exist, create it
        try {
          this.logger.log(`Bucket ${this.bucketName} not found, attempting to create...`);
          await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
          this.logger.log(`✅ Bucket ${this.bucketName} created successfully`);
        } catch (createError: any) {
          this.logger.error(`❌ Failed to create bucket ${this.bucketName}:`, createError.message);
          if (createError.$metadata?.httpStatusCode === 403) {
            this.logger.error(`   This is likely a credentials issue. Check your MinIO/S3 credentials.`);
          }
        }
      } else {
        this.logger.error(`Error checking bucket ${this.bucketName}:`, error);
      }
    }
  }

  /**
   * Generate a presigned URL for direct upload to S3.
   * @param maxSizeBytes - Maximum allowed file size (default: 50MB)
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600, // 1 hour default
    maxSizeBytes: number = 50 * 1024 * 1024, // 50MB default
  ): Promise<string> {
    // Ensure bucket exists before generating presigned URL
    if (this.isLocal) {
      await this.ensureBucketExists();
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      this.logger.log(`Generated presigned URL for key: ${key} (configured max ${Math.round(maxSizeBytes / 1024 / 1024)}MB)`);
      return signedUrl;
    } catch (error: any) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a presigned URL for downloading/viewing file
   */
  async generatePresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
    return signedUrl;
  }

  /**
   * Delete an object from S3/MinIO by key
   */
  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3Client.send(command);
      this.logger.log(`Deleted object: ${key}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete object ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Get public URL for uploaded file
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Generate a unique key for PPT deck upload
   */
  generatePptDeckKey(eventId: string, fileName: string): string {
    const timestamp = Date.now();
    const extension = fileName.split('.').pop() || 'pptx';
    return `events/${eventId}/ppt-deck/${timestamp}.${extension}`;
  }

  /**
   * Generate a unique key for logo upload
   */
  generateLogoKey(entityType: string, entityId: string, fileName: string): string {
    const timestamp = Date.now();
    const extension = fileName.split('.').pop() || 'png';
    return `${entityType}/${entityId}/logo/${timestamp}.${extension}`;
  }

  // Keep existing upload method for backward compatibility
  async upload(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      const url = this.getPublicUrl(key);

      this.logger.log(`File uploaded successfully: ${key}`);
      return { url, key };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${key}`, error);
      throw error;
    }
  }

  /**
   * Upload PPT Deck (legacy method - kept for backward compatibility)
   */
  async uploadPptDeck(eventId: string, file: Buffer, originalFilename: string): Promise<UploadResult> {
    const extension = originalFilename.split('.').pop() || 'pptx';
    const key = `events/${eventId}/ppt-deck/${Date.now()}.${extension}`;
    const contentType = this.getContentType(extension);

    return this.upload(file, key, contentType);
  }

  /**
   * Upload Logo (legacy method)
   */
  async uploadLogo(
    entityType: 'events' | 'companies' | 'organizers',
    entityId: string,
    file: Buffer,
    contentType: string,
  ): Promise<UploadResult> {
    const key = `${entityType}/${entityId}/logo/${Date.now()}`;
    return this.upload(file, key, contentType);
  }

  private getContentType(extension: string): string {
    const types: Record<string, string> = {
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ppt: 'application/vnd.ms-powerpoint',
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return types[extension.toLowerCase()] || 'application/octet-stream';
  }
}
