import { emailLayout, ctaButton } from './email-layout';

export interface WelcomeTemplateData {
  userName?: string;
  userEmail: string;
  dashboardUrl?: string;
}

export function welcomeTemplate(data: WelcomeTemplateData): { html: string; text: string; subject: string } {
  const name = data.userName || data.userEmail.split('@')[0];
  const dashboardUrl = data.dashboardUrl || process.env.FRONTEND_URL || 'https://sponsiwise.com/dashboard';

  const html = emailLayout(
    `<div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:16px;">🎉</div>
        <h1 style="margin:0 0 12px 0;font-size:26px;font-weight:800;color:#f1f5f9;">Welcome to SponsiWise!</h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.6;">You're now part of the smartest sponsorship platform in India.</p>
      </div>

      <div style="background:#0f172a;border-radius:10px;border:1px solid #334155;padding:24px;margin-bottom:24px;">
        <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Account Created</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;">Hi, ${name}!</p>
        <p style="margin:8px 0 0 0;font-size:14px;color:#94a3b8;">${data.userEmail}</p>
      </div>

      <p style="font-size:15px;color:#cbd5e1;line-height:1.7;margin:0 0 24px 0;">
        SponsiWise connects event organizers with the right sponsors — and helps brands discover events that perfectly match their audience. Here's what you can do next:
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
        <tr>
          <td style="padding:12px;background:#0f172a;border-radius:8px;border:1px solid #334155;">
            <p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:#a78bfa;">🏢 For Brands / Sponsors</p>
            <p style="margin:0;font-size:13px;color:#94a3b8;">Complete your company profile and start browsing events to sponsor.</p>
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px;background:#0f172a;border-radius:8px;border:1px solid #334155;">
            <p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:#34d399;">🎪 For Event Organizers</p>
            <p style="margin:0;font-size:13px;color:#94a3b8;">List your event, define sponsorship tiers, and attract the right sponsors.</p>
          </td>
        </tr>
      </table>

      ${ctaButton('Go to Dashboard', dashboardUrl, 'purple')}
    </div>`,
    `Welcome to SponsiWise, ${name}!`,
  );

  return {
    subject: '🎉 Welcome to SponsiWise — Your Sponsorship Journey Starts Here',
    html,
    text: `Welcome to SponsiWise, ${name}!\n\nYour account (${data.userEmail}) has been created successfully.\n\nVisit your dashboard: ${dashboardUrl}`,
  };
}
