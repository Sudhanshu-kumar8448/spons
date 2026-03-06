import { emailLayout, infoRow, badge, ctaButton } from './email-layout';

export interface InterestExpressedTemplateData {
  recipientType: 'organizer' | 'brand' | 'manager';
  recipientName?: string;
  companyName: string;
  eventTitle: string;
  eventId: string;
  companyId: string;
  sponsorshipId: string;
  dashboardUrl?: string;
}

export function interestExpressedTemplate(data: InterestExpressedTemplateData): { html: string; text: string; subject: string } {
  const base = data.dashboardUrl || process.env.FRONTEND_URL || 'https://sponsiwise.com';

  const recipientMessages: Record<string, { headline: string; body: string; url: string; btnText: string }> = {
    organizer: {
      headline: '🔔 A brand has expressed interest in your event!',
      body: `<strong style="color:#f1f5f9;">${data.companyName}</strong> has shown interest in sponsoring your event. Review their profile and start a conversation to move the deal forward.`,
      url: `${base}/organizer/events/${data.eventId}`,
      btnText: 'View Event Sponsorships',
    },
    brand: {
      headline: '✅ Your sponsorship interest has been recorded',
      body: `Your interest in sponsoring <strong style="color:#f1f5f9;">${data.eventTitle}</strong> has been recorded. The organizer will be informed and our team will review your request.`,
      url: `${base}/brand/sponsorships/${data.sponsorshipId}`,
      btnText: 'Track Your Interest',
    },
    manager: {
      headline: '📋 New sponsorship interest — action may be required',
      body: `<strong style="color:#f1f5f9;">${data.companyName}</strong> has expressed interest in sponsoring <strong style="color:#f1f5f9;">${data.eventTitle}</strong>. Please review to ensure the pairing meets platform standards.`,
      url: `${base}/manager/events/${data.eventId}`,
      btnText: 'Review in Dashboard',
    },
  };

  const msg = recipientMessages[data.recipientType];

  const html = emailLayout(
    `<div style="padding:40px 32px;">
      <div style="margin-bottom:24px;">
        <div style="font-size:36px;margin-bottom:16px;">🤝</div>
        <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;color:#f1f5f9;">${msg.headline}</h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">${msg.body}</p>
      </div>

      <div style="background:#0f172a;border-radius:10px;border:1px solid #334155;padding:20px;margin-bottom:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          ${infoRow('Brand / Company', data.companyName)}
          ${infoRow('Event', data.eventTitle)}
          ${infoRow('Status', badge('Interest Expressed', 'amber'))}
          ${infoRow('Sponsorship ID', `<code style="font-size:12px;background:#1e293b;padding:2px 6px;border-radius:4px;color:#a78bfa;">#${data.sponsorshipId.slice(0, 8)}</code>`)}
        </table>
      </div>

      <div style="background:#0c1a2e;border-radius:8px;border:1px solid #1d4ed8;padding:16px;margin-bottom:8px;">
        <p style="margin:0;font-size:13px;color:#93c5fd;line-height:1.6;">
          💡 <strong>Next step:</strong> ${
            data.recipientType === 'organizer'
              ? 'Review the brand profile and respond to their interest.'
              : data.recipientType === 'brand'
                ? 'Our team will review your interest and get back to you shortly.'
                : 'Ensure both parties meet the verification requirements before proceeding.'
          }
        </p>
      </div>

      ${ctaButton(msg.btnText, msg.url, 'blue')}
    </div>`,
    `${data.companyName} is interested in ${data.eventTitle}`,
  );

  return {
    subject: data.recipientType === 'brand'
      ? `✅ Interest Recorded — ${data.eventTitle}`
      : `🔔 New Sponsorship Interest — ${data.eventTitle}`,
    html,
    text: `${msg.headline}\n\nBrand: ${data.companyName}\nEvent: ${data.eventTitle}\nSponsorshipID: ${data.sponsorshipId}\n\nVisit: ${msg.url}`,
  };
}
