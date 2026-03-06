import { emailLayout, badge, ctaButton } from './email-layout';

export interface CompanyRejectedTemplateData {
  companyName?: string;
  companyId: string;
  reviewerNotes?: string | null;
  dashboardUrl?: string;
}

export function companyRejectedTemplate(data: CompanyRejectedTemplateData): { html: string; text: string; subject: string } {
  const base = data.dashboardUrl || process.env.FRONTEND_URL || 'https://sponsiwise.com';
  const profileUrl = `${base}/brand/profile`;

  const html = emailLayout(
    `<div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:12px;">📋</div>
        <h1 style="margin:0 0 10px 0;font-size:24px;font-weight:800;color:#f1f5f9;">Company Verification Update</h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">
          Unfortunately, ${data.companyName ? `<strong style="color:#e2e8f0;">${data.companyName}</strong>` : 'your company'} was not approved at this time. Please review the feedback and resubmit.
        </p>
      </div>

      <div style="background:#0f172a;border-radius:10px;border:1px solid #334155;padding:20px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Company</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#e2e8f0;">${data.companyName || 'Your Company'}</p>
          </div>
          <div>${badge('Rejected', 'red')}</div>
        </div>
        ${data.reviewerNotes ? `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #334155;">
          <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Reason / Feedback</p>
          <p style="margin:0;font-size:14px;color:#fca5a5;line-height:1.6;font-style:italic;">"${data.reviewerNotes}"</p>
        </div>` : `
        <div style="margin-top:16px;padding:12px;background:#1f0a0a;border-radius:6px;">
          <p style="margin:0;font-size:13px;color:#fca5a5;">No specific feedback was provided. Please ensure all required details are complete and accurate.</p>
        </div>`}
      </div>

      <div style="background:#1c0a0a;border-radius:8px;border:1px solid #991b1b;padding:16px;margin-bottom:8px;">
        <p style="margin:0;font-size:13px;color:#fca5a5;line-height:1.6;">
          🔄 <strong>What to do:</strong> Update your company profile with accurate information (logo, website, business type, strategic intent) and resubmit for review. Our team typically responds within 2–3 business days.
        </p>
      </div>

      ${ctaButton('Update Company Profile', profileUrl, 'blue')}
    </div>`,
    `Verification update for ${data.companyName || 'your company'}`,
  );

  return {
    subject: `❌ Company Verification Update — Action Required`,
    html,
    text: `${data.companyName || 'Your company'} was not approved.\n${data.reviewerNotes ? `\nFeedback: ${data.reviewerNotes}` : ''}\n\nUpdate your profile: ${profileUrl}`,
  };
}
