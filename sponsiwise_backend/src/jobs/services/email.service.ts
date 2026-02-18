import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { EmailLogsService } from '../../email-logs/email-logs.service';

/**
 * Real email service using Nodemailer with SMTP transport.
 *
 * Configured via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Logs every send attempt (success or failure) to the email_logs table.
 * Stateless transporter — safe for concurrent invocation from multiple workers.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly emailLogsService: EmailLogsService) {
    this.transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.from = process.env.SMTP_FROM || 'noreply@sponsiwise.com';

    this.logger.log(
      `EmailService initialised — SMTP host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`,
    );
  }

  /**
   * Send an email via SMTP and persist the result to email_logs.
   *
   * @throws Error when sending fails after logging the error.
   */
  async send(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    tenantId: string;
    jobName: string;
    entityType?: string;
    entityId?: string;
  }): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(
        `Email sent to ${options.to} | Subject: "${options.subject}" | messageId: ${info.messageId}`,
      );

      // Fire-and-forget — never block on log persistence
      this.emailLogsService.log({
        tenantId: options.tenantId,
        recipient: options.to,
        subject: options.subject,
        jobName: options.jobName,
        entityType: options.entityType,
        entityId: options.entityId,
        status: 'SENT',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to send email to ${options.to}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Log failure — fire-and-forget
      this.emailLogsService.log({
        tenantId: options.tenantId,
        recipient: options.to,
        subject: options.subject,
        jobName: options.jobName,
        entityType: options.entityType,
        entityId: options.entityId,
        status: 'FAILED',
        errorMessage,
      });

      throw new Error('Email sending failed');
    }
  }
}
