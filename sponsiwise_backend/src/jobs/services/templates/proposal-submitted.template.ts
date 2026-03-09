import { emailLayout, infoRow, badge, ctaButton } from './email-layout';

export interface ProposalSubmittedTemplateData {
  recipientType: 'organizer';
  eventTitle: string;
  proposalId: string;
  companyName?: string;
  proposedAmount?: number;
  dashboardUrl?: string;
}

export function proposalSubmittedTemplate(data: ProposalSubmittedTemplateData): { html: string; text: string; subject: string } {
  const base = data.dashboardUrl || process.env.FRONTEND_URL || 'https://sponsiwise.com';
  const dashboardUrl = `${base}/organizer/events/proposals`;
  const amountStr = data.proposedAmount
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data.proposedAmount)
    : 'Under review';

  const html = emailLayout(
    `<div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:12px;">📬</div>
        <h1 style="margin:0 0 10px 0;font-size:24px;font-weight:800;color:#f1f5f9;">New Sponsorship Proposal</h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">
          ${data.companyName ? `<strong style="color:#e2e8f0;">${data.companyName}</strong> has` : 'A sponsor has'} submitted a sponsorship proposal for your event.
        </p>
      </div>

      <div style="background:#0f172a;border-radius:10px;border:1px solid #334155;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px 0;font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Proposal Details</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          ${data.companyName ? infoRow('From', data.companyName) : ''}
          ${infoRow('Event', data.eventTitle)}
          ${infoRow('Proposed Amount', `<strong style="color:#fbbf24;">${amountStr}</strong>`)}
          ${infoRow('Status', badge('Pending Review', 'amber'))}
          ${infoRow('Proposal ID', `<code style="font-size:12px;background:#1e293b;padding:2px 6px;border-radius:4px;color:#a78bfa;">#${data.proposalId.slice(0, 8)}</code>`)}
        </table>
      </div>

      <div style="background:#0c1a2e;border-radius:8px;border:1px solid #1d4ed8;padding:16px;margin-bottom:8px;">
        <p style="margin:0;font-size:13px;color:#93c5fd;line-height:1.6;">
          👀 <strong>Action required:</strong> Review this proposal in your dashboard. You can accept, request changes, or decline the proposal.
        </p>
      </div>

      ${ctaButton('Review Proposal', dashboardUrl, 'purple')}
    </div>`,
    `New proposal for ${data.eventTitle}`,
  );

  return {
    subject: `📬 New Proposal — ${data.eventTitle}${data.companyName ? ` from ${data.companyName}` : ''}`,
    html,
    text: `A new sponsorship proposal has been submitted for "${data.eventTitle}".\n${data.companyName ? `From: ${data.companyName}\n` : ''}Amount: ${amountStr}\nProposal ID: ${data.proposalId}\n\nReview it: ${dashboardUrl}`,
  };
}
