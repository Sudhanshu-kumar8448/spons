import { emailLayout, badge, ctaButton } from './email-layout';

export interface CompanyVerifiedTemplateData {
  companyName?: string;
  companyId: string;
  reviewerNotes?: string | null;
  dashboardUrl?: string;
}

export function companyVerifiedTemplate(data: CompanyVerifiedTemplateData): { html: string; text: string; subject: string } {
  const base = data.dashboardUrl || process.env.FRONTEND_URL || 'https://sponsiwise.com';
  const dashboardUrl = `${base}/brand/dashboard`;

  const html = emailLayout(
    `<div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:12px;">🏆</div>
        <h1 style="margin:0 0 10px 0;font-size:24px;font-weight:800;color:#f1f5f9;">Company Verified!</h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">
          ${data.companyName ? `<strong style="color:#e2e8f0;">${data.companyName}</strong> has` : 'Your company has'} been reviewed and verified by our team. You can now browse events and submit sponsorship proposals.
        </p>
      </div>

      <div style="background:#0f172a;border-radius:10px;border:1px solid #334155;padding:20px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Company</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#e2e8f0;">${data.companyName || 'Your Company'}</p>
          </div>
          <div>${badge('Verified Sponsor', 'green')}</div>
        </div>
        ${data.reviewerNotes ? `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #334155;">
          <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Reviewer Notes</p>
          <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.6;font-style:italic;">"${data.reviewerNotes}"</p>
        </div>` : ''}
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
        <tr>
          <td style="padding:12px;background:#0f172a;border-radius:8px;border:1px solid #166534;width:50%;">
            <p style="margin:0 0 4px 0;font-size:20px;">🎯</p>
            <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#4ade80;">Browse Events</p>
            <p style="margin:0;font-size:12px;color:#6b7280;">Find events that match your brand's audience.</p>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:12px;background:#0f172a;border-radius:8px;border:1px solid #1d4ed8;width:50%;">
            <p style="margin:0 0 4px 0;font-size:20px;">💌</p>
            <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#60a5fa;">Submit Proposals</p>
            <p style="margin:0;font-size:12px;color:#6b7280;">Negotiate sponsorship terms directly with organizers.</p>
          </td>
        </tr>
      </table>

      ${ctaButton('Start Browsing Events', dashboardUrl, 'purple')}
    </div>`,
    `${data.companyName || 'Your company'} has been verified on SponsiWise`,
  );

  return {
    subject: `🏆 Company Verified — Welcome to SponsiWise Sponsors!`,
    html,
    text: `${data.companyName || 'Your company'} has been verified on SponsiWise.\n${data.reviewerNotes ? `\nNotes: ${data.reviewerNotes}` : ''}\n\nVisit your dashboard: ${dashboardUrl}`,
  };
}
