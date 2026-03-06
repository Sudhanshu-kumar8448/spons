import { emailLayout, badge, ctaButton } from './email-layout';

export interface EventVerifiedTemplateData {
  organizerName?: string;
  eventTitle: string;
  eventId: string;
  reviewerNotes?: string | null;
  dashboardUrl?: string;
}

export function eventVerifiedTemplate(data: EventVerifiedTemplateData): { html: string; text: string; subject: string } {
  const base = data.dashboardUrl || process.env.FRONTEND_URL || 'https://sponsiwise.com';
  const eventUrl = `${base}/organizer/events/${data.eventId}`;

  const html = emailLayout(
    `<div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:12px;">✅</div>
        <h1 style="margin:0 0 10px 0;font-size:24px;font-weight:800;color:#f1f5f9;">Your Event Has Been Verified!</h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">
          ${data.organizerName ? `Hi ${data.organizerName}, your` : 'Your'} event has been reviewed and approved by our team. It is now live and visible to potential sponsors.
        </p>
      </div>

      <div style="background:#0f172a;border-radius:10px;border:1px solid #334155;padding:20px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Event</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#e2e8f0;">${data.eventTitle}</p>
          </div>
          <div>${badge('Verified', 'green')}</div>
        </div>
        ${data.reviewerNotes ? `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #334155;">
          <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Reviewer Notes</p>
          <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.6;font-style:italic;">"${data.reviewerNotes}"</p>
        </div>` : ''}
      </div>

      <div style="background:#052e16;border-radius:8px;border:1px solid #166534;padding:16px;margin-bottom:8px;">
        <p style="margin:0;font-size:13px;color:#4ade80;line-height:1.6;">
          🚀 <strong>Your event is now live!</strong> Sponsors can discover and express interest in your event. Keep your event details up to date to attract the best sponsors.
        </p>
      </div>

      ${ctaButton('View Event Dashboard', eventUrl, 'green')}
    </div>`,
    `Your event "${data.eventTitle}" has been verified`,
  );

  return {
    subject: `✅ Event Verified — ${data.eventTitle} is now live!`,
    html,
    text: `Your event "${data.eventTitle}" has been verified and is now visible to sponsors.\n${data.reviewerNotes ? `\nReviewer notes: ${data.reviewerNotes}` : ''}\n\nView your event: ${eventUrl}`,
  };
}
