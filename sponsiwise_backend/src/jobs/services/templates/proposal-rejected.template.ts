import { emailLayout, infoRow, badge, ctaButton } from './email-layout';

export interface ProposalRejectedTemplateData {
  companyName?: string;
  eventTitle: string;
  proposalId: string;
  proposedAmount?: number;
  notes?: string;
  dashboardUrl?: string;
}

export function proposalRejectedTemplate(data: ProposalRejectedTemplateData): { html: string; text: string; subject: string } {
  const base = data.dashboardUrl || process.env.FRONTEND_URL || 'https://sponsiwise.com';
  const dashboardUrl = `${base}/brand/browseEvents`;
  const amountStr = data.proposedAmount
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data.proposedAmount)
    : 'N/A';

  const html = emailLayout(
    `<div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:12px;">📋</div>
        <h1 style="margin:0 0 10px 0;font-size:24px;font-weight:800;color:#f1f5f9;">Proposal Update</h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">
          Unfortunately your sponsorship proposal was not approved at this time. Please review the feedback below.
        </p>
      </div>

      <div style="background:#0f172a;border-radius:10px;border:1px solid #334155;padding:20px;margin-bottom:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          ${data.companyName ? infoRow('Company', data.companyName) : ''}
          ${infoRow('Event', data.eventTitle)}
          ${infoRow('Amount', amountStr)}
          ${infoRow('Status', badge('Rejected', 'red'))}
          ${infoRow('Proposal ID', `<code style="font-size:12px;background:#1e293b;padding:2px 6px;border-radius:4px;color:#a78bfa;">#${data.proposalId.slice(0, 8)}</code>`)}
        </table>
        ${data.notes ? `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #334155;">
          <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Feedback</p>
          <p style="margin:0;font-size:14px;color:#fca5a5;line-height:1.6;font-style:italic;">"${data.notes}"</p>
        </div>` : ''}
      </div>

      <div style="background:#0c1a2e;border-radius:8px;border:1px solid #1d4ed8;padding:16px;margin-bottom:8px;">
        <p style="margin:0;font-size:13px;color:#93c5fd;line-height:1.6;">
          💡 <strong>Don't give up!</strong> There are plenty of other events on SponsiWise that may be a perfect fit for your brand. Browse and submit another proposal.
        </p>
      </div>

      ${ctaButton('Browse More Events', dashboardUrl, 'blue')}
    </div>`,
    `Your proposal for ${data.eventTitle} was not approved`,
  );

  return {
    subject: `📋 Proposal Update — ${data.eventTitle}`,
    html,
    text: `Your proposal for "${data.eventTitle}" was not approved.\n${data.notes ? `Feedback: ${data.notes}\n` : ''}Proposal ID: ${data.proposalId}\n\nBrowse events: ${dashboardUrl}`,
  };
}
