import { emailLayout, infoRow, badge, ctaButton } from './email-layout';

export interface DealFinalizedTemplateData {
  recipientType: 'organizer' | 'sponsor' | 'admin' | 'manager';
  recipientName?: string;
  companyName: string;
  eventTitle: string;
  eventId: string;
  proposalId: string;
  sponsorshipId: string;
  proposedAmount?: number;
  tierType?: string;
  dashboardUrl?: string;
}

export function dealFinalizedTemplate(data: DealFinalizedTemplateData): { html: string; text: string; subject: string } {
  const base = data.dashboardUrl || process.env.FRONTEND_URL || 'https://sponsiwise.com';
  const amountStr = data.proposedAmount
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data.proposedAmount)
    : 'As negotiated';

  const recipientMessages: Record<string, { headline: string; body: string; url: string; btnText: string }> = {
    organizer: {
      headline: '🎊 Deal Finalized — Congratulations!',
      body: `Great news! The sponsorship proposal from <strong style="color:#f1f5f9;">${data.companyName}</strong> for your event <strong style="color:#f1f5f9;">${data.eventTitle}</strong> has been approved. The deal is now officially finalized.`,
      url: `${base}/organizer/events/${data.eventId}`,
      btnText: 'View Event Details',
    },
    sponsor: {
      headline: '🎉 Your Proposal Was Approved!',
      body: `Your sponsorship proposal for <strong style="color:#f1f5f9;">${data.eventTitle}</strong> has been approved and the deal is finalized. Welcome aboard as an official sponsor!`,
      url: `${base}/brand/proposals/${data.proposalId}`,
      btnText: 'View Proposal',
    },
    admin: {
      headline: '📋 Deal Finalized — For Your Records',
      body: `A sponsorship deal has been finalized between <strong style="color:#f1f5f9;">${data.companyName}</strong> and the organizer of <strong style="color:#f1f5f9;">${data.eventTitle}</strong>.`,
      url: `${base}/admin`,
      btnText: 'View in Admin Panel',
    },
    manager: {
      headline: '📋 Deal Finalized — Review Required',
      body: `A sponsorship deal has been finalized between <strong style="color:#f1f5f9;">${data.companyName}</strong> and the organizer of <strong style="color:#f1f5f9;">${data.eventTitle}</strong>. Please review the deal details.`,
      url: `${base}/manager/dashboard`,
      btnText: 'View in Manager Panel',
    },
  };

  const msg = recipientMessages[data.recipientType];

  const html = emailLayout(
    `<div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:12px;">🤝</div>
        <h1 style="margin:0 0 10px 0;font-size:24px;font-weight:800;color:#f1f5f9;">${msg.headline}</h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">${msg.body}</p>
      </div>

      <div style="background:#0f172a;border-radius:10px;border:1px solid #334155;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px 0;font-size:12px;font-weight:700;color:#34d399;text-transform:uppercase;letter-spacing:1px;">Deal Summary</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          ${infoRow('Sponsor', data.companyName)}
          ${infoRow('Event', data.eventTitle)}
          ${data.tierType ? infoRow('Tier', badge(data.tierType, 'purple')) : ''}
          ${infoRow('Amount', `<strong style="color:#4ade80;font-size:16px;">${amountStr}</strong>`)}
          ${infoRow('Status', badge('Deal Finalized', 'green'))}
          ${infoRow('Proposal ID', `<code style="font-size:12px;background:#1e293b;padding:2px 6px;border-radius:4px;color:#a78bfa;">#${data.proposalId.slice(0, 8)}</code>`)}
        </table>
      </div>

      <div style="background:#052e16;border-radius:8px;border:1px solid #166534;padding:16px;margin-bottom:8px;">
        <p style="margin:0;font-size:13px;color:#4ade80;line-height:1.6;">
          ✅ <strong>What happens next:</strong> ${
            data.recipientType === 'organizer'
              ? 'The sponsor will be in touch regarding event logistics and branding materials.'
              : data.recipientType === 'sponsor'
                ? 'The event organizer will be in touch to share branding guidelines and event logistics.'
                : 'Both parties have been notified. Ensure all contractual obligations are completed.'
          }
        </p>
      </div>

      ${ctaButton(msg.btnText, msg.url, 'green')}
    </div>`,
    `Deal finalized — ${data.companyName} × ${data.eventTitle}`,
  );

  return {
    subject: data.recipientType === 'admin'
      ? `📋 Deal Finalized — ${data.companyName} × ${data.eventTitle}`
      : `🎊 Deal Finalized — ${data.eventTitle}`,
    html,
    text: `Deal Finalized!\n\nSponsor: ${data.companyName}\nEvent: ${data.eventTitle}\nAmount: ${amountStr}\nProposal ID: ${data.proposalId}\n\nVisit: ${msg.url}`,
  };
}
