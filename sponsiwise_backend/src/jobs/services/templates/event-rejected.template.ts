import { emailLayout, badge, ctaButton } from './email-layout';

export interface EventRejectedTemplateData {
  organizerName?: string;
  eventTitle: string;
  eventId: string;
  reviewerNotes?: string | null;
  dashboardUrl?: string;
}

export function eventRejectedTemplate(data: EventRejectedTemplateData): { html: string; text: string; subject: string } {
  const base = data.dashboardUrl || process.env.FRONTEND_URL || 'https://sponsiwise.com';
  const eventUrl = `${base}/organizer/events/${data.eventId}`;

  const html = emailLayout(
    `<div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:12px;">❌</div>
        <h1 style="margin:0 0 10px 0;font-size:24px;font-weight:800;color:#f1f5f9;">Event Verification Update</h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">
          ${data.organizerName ? `Hi ${data.organizerName}, unfortunately your` : 'Unfortunately your'} event was not approved in this review cycle. Please see the feedback below and make the necessary changes.
        </p>
      </div>

      <div style="background:#0f172a;border-radius:10px;border:1px solid #334155;padding:20px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Event</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#e2e8f0;">${data.eventTitle}</p>
          </div>
          <div>${badge('Rejected', 'red')}</div>
        </div>
        ${data.reviewerNotes ? `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #334155;">
          <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Reason / Feedback</p>
          <p style="margin:0;font-size:14px;color:#fca5a5;line-height:1.6;font-style:italic;">"${data.reviewerNotes}"</p>
        </div>` : `
        <div style="margin-top:16px;padding:12px;background:#1f0a0a;border-radius:6px;">
          <p style="margin:0;font-size:13px;color:#fca5a5;">No specific reason was given. Please contact support if you have questions.</p>
        </div>`}
      </div>

      <div style="background:#1c0a0a;border-radius:8px;border:1px solid #991b1b;padding:16px;margin-bottom:8px;">
        <p style="margin:0;font-size:13px;color:#fca5a5;line-height:1.6;">
          🔄 <strong>Next steps:</strong> Review the feedback, update your event details, and resubmit for verification. Our team reviews submissions within 2–3 business days.
        </p>
      </div>

      ${ctaButton('Edit & Resubmit Event', eventUrl, 'blue')}
    </div>`,
    `Verification update for your event "${data.eventTitle}"`,
  );

  return {
    subject: `❌ Event Verification Update — ${data.eventTitle}`,
    html,
    text: `Your event "${data.eventTitle}" was not approved.\n${data.reviewerNotes ? `\nFeedback: ${data.reviewerNotes}` : ''}\n\nPlease review and resubmit: ${eventUrl}`,
  };
}
