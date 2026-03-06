import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailLogsService } from '../../email-logs/email-logs.service';

/**
 * EmailService — sends transactional emails via Resend.
 *
 * Configured via environment variables:
 *   RESEND_API_KEY   — Resend API key (required)
 *   EMAIL_FROM       — Sender address, e.g. "SponsiWise <noreply@sponsiwise.com>"
 *
 * Logs every send attempt (success or failure) to the email_logs table.
 * Instanced once per application — safe for concurrent queue workers.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly emailLogsService: EmailLogsService) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('EmailService initialised — provider: Resend');
    } else {
      this.resend = null;
      this.logger.warn('EmailService: RESEND_API_KEY not set — emails will be skipped');
    }
    this.from = process.env.EMAIL_FROM || 'SponsiWise <noreply@sponsiwise.com>';
  }

  /**
   * Send an email via Resend and persist the result to email_logs.
   *
   * @throws Error when sending fails (after logging the error to email_logs).
   */
  async send(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    jobName: string;
    entityType?: string;
    entityId?: string;
  }): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `Email skipped (no API key) — to: ${options.to} | subject: "${options.subject}"`,
      );
      return;
    }
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        throw new Error(error.message);
      }

      this.logger.log(
        `Email sent to ${options.to} | Subject: "${options.subject}" | id: ${data?.id}`,
      );

      // Fire-and-forget — never block on log persistence
      this.emailLogsService.log({
        recipient: options.to,
        subject: options.subject,
        jobName: options.jobName,
        entityType: options.entityType,
        entityId: options.entityId,
        status: 'SENT',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      this.logger.error(
        `Failed to send email to ${options.to}: ${errorMessage}`,
        err instanceof Error ? err.stack : undefined,
      );

      // Log failure — fire-and-forget
      this.emailLogsService.log({
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
