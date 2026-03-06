import { emailLayout, infoRow, ctaButton } from './email-layout';

export interface DeliverablesFormSentTemplateData {
  organizerName?: string;
  eventName: string;
  tierType: string;
  eventId: string;
  dashboardUrl?: string;
}

export function deliverablesFormSentTemplate(data: DeliverablesFormSentTemplateData): {
  html: string;
  text: string;
  subject: string;
} {
  const base = data.dashboardUrl || process.env.FRONTEND_URL || 'https://sponsiwise.com';
  const url = `${base}/organizer/events/${data.eventId}`;

  const html = emailLayout(
    `<div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:12px;">📋</div>
        <h1 style="margin:0 0 10px 0;font-size:24px;font-weight:800;color:#f1f5f9;">Deliverable Form Ready</h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">
          A deliverable form for the <strong style="color:#f1f5f9;">${data.tierType}</strong> tier
          of your event <strong style="color:#f1f5f9;">${data.eventName}</strong> has been created
          by the SponsiWise team and is ready for you to review and fill in.
        </p>
      </div>

      <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:20px;margin-bottom:28px;">
        ${infoRow('Event', data.eventName)}
        ${infoRow('Tier', data.tierType)}
        ${infoRow('Action Required', 'Fill in deliverable details')}
      </div>

      <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:28px;">
        Please log in to your organizer dashboard and navigate to your event page to fill in the
        deliverable details. Once completed, submit the form for final review.
      </p>

      <div style="text-align:center;">
        ${ctaButton('Fill Deliverables', url)}
      </div>
    </div>`,
  );

  const text = [
    `Deliverable Form Ready`,
    ``,
    `A deliverable form for the ${data.tierType} tier of your event "${data.eventName}" is ready for you to fill in.`,
    ``,
    `Please log in to fill the details: ${url}`,
  ].join('\n');

  return {
    html,
    text,
    subject: `Action Required: Fill Deliverable Form — ${data.eventName} (${data.tierType})`,
  };
}
