import { emailLayout, infoRow, badge, ctaButton } from './email-layout';

export interface ProposalApprovedTemplateData {
  companyName?: string;
  eventTitle: string;
  proposalId: string;
  proposedAmount?: number;
  dashboardUrl?: string;
}

export function proposalApprovedTemplate(data: ProposalApprovedTemplateData): { html: string; text: string; subject: string } {
  const base = data.dashboardUrl || process.env.FRONTEND_URL || 'https://sponsiwise.com';
  const proposalUrl = `${base}/brand/proposals/${data.proposalId}`;
  const amountStr = data.proposedAmount
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data.proposedAmount)
    : 'As proposed';

  const html = emailLayout(
    `<div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:12px;">🎉</div>
        <h1 style="margin:0 0 10px 0;font-size:24px;font-weight:800;color:#f1f5f9;">Proposal Approved!</h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">
          Great news! Your sponsorship proposal has been approved. You're one step closer to making the event a success.
        </p>
      </div>

      <div style="background:#0f172a;border-radius:10px;border:1px solid #334155;padding:20px;margin-bottom:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          ${data.companyName ? infoRow('Company', data.companyName) : ''}
          ${infoRow('Event', data.eventTitle)}
          ${infoRow('Amount', `<strong style="color:#4ade80;font-size:16px;">${amountStr}</strong>`)}
          ${infoRow('Status', badge('Approved', 'green'))}
          ${infoRow('Proposal ID', `<code style="font-size:12px;background:#1e293b;padding:2px 6px;border-radius:4px;color:#a78bfa;">#${data.proposalId.slice(0, 8)}</code>`)}
        </table>
      </div>

      <div style="background:#052e16;border-radius:8px;border:1px solid #166534;padding:16px;margin-bottom:8px;">
        <p style="margin:0;font-size:13px;color:#4ade80;line-height:1.6;">
          🤝 <strong>Next steps:</strong> The organizer will be in touch to finalise sponsorship details, branding opportunities, and event logistics.
        </p>
      </div>

      ${ctaButton('View Proposal', proposalUrl, 'green')}
    </div>`,
    `Your proposal for ${data.eventTitle} has been approved`,
  );

  return {
    subject: `🎉 Proposal Approved — ${data.eventTitle}`,
    html,
    text: `Your proposal for "${data.eventTitle}" has been approved!\nAmount: ${amountStr}\nProposal ID: ${data.proposalId}\n\nView details: ${proposalUrl}`,
  };
}
