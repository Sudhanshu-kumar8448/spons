import { emailLayout, infoRow, ctaButton } from './email-layout';

export interface DeliverablesBatchSentTemplateData {
  organizerName?: string;
  eventName: string;
  tiers: Array<{ tierType: string }>;
  eventId: string;
  dashboardUrl?: string;
}

export function deliverablesBatchSentTemplate(data: DeliverablesBatchSentTemplateData): {
  html: string;
  text: string;
  subject: string;
} {
  const base = data.dashboardUrl || process.env.FRONTEND_URL || 'https://sponsiwise.com';
  const url = `${base}/organizer/events/${data.eventId}`;

  const tierListHtml = data.tiers
    .map(
      (t) =>
        `<li style="padding:6px 0;color:#f1f5f9;font-size:14px;">
          <strong style="color:#818cf8;">●</strong> ${t.tierType}
        </li>`,
    )
    .join('');

  const tierListText = data.tiers.map((t) => `  • ${t.tierType}`).join('\n');

  const html = emailLayout(
    `<div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:12px;">📋</div>
        <h1 style="margin:0 0 10px 0;font-size:24px;font-weight:800;color:#f1f5f9;">Deliverable Forms Ready</h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">
          The SponsiWise team has created deliverable forms for
          <strong style="color:#f1f5f9;">${data.tiers.length} tier${data.tiers.length > 1 ? 's' : ''}</strong>
          of your event <strong style="color:#f1f5f9;">${data.eventName}</strong>.
          Please review and fill them in.
        </p>
      </div>

      <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:20px;margin-bottom:28px;">
        ${infoRow('Event', data.eventName)}
        ${infoRow('Tiers', `${data.tiers.length} form${data.tiers.length > 1 ? 's' : ''} ready`)}
        <div style="margin-top:12px;">
          <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Tiers Included</p>
          <ul style="margin:0;padding:0 0 0 16px;list-style:none;">
            ${tierListHtml}
          </ul>
        </div>
      </div>

      <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:28px;">
        Please log in to your organizer dashboard and navigate to your event page to fill in the
        deliverable details for each tier. Once completed, submit the forms for final review.
      </p>

      <div style="text-align:center;">
        ${ctaButton('Fill Deliverables', url)}
      </div>
    </div>`,
  );

  const text = [
    `Deliverable Forms Ready`,
    ``,
    `Deliverable forms for ${data.tiers.length} tier(s) of your event "${data.eventName}" are ready for you to fill in.`,
    ``,
    `Tiers:`,
    tierListText,
    ``,
    `Please log in to fill the details: ${url}`,
  ].join('\n');

  return {
    html,
    text,
    subject: `Action Required: Fill Deliverable Forms — ${data.eventName} (${data.tiers.length} tier${data.tiers.length > 1 ? 's' : ''})`,
  };
}
