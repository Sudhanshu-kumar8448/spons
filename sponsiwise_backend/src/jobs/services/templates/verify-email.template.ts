import { emailLayout, ctaButton } from './email-layout';

export interface VerifyEmailTemplateData {
  userEmail: string;
  verificationUrl: string;
}

export function verifyEmailTemplate(data: VerifyEmailTemplateData): { html: string; text: string; subject: string } {
  const name = data.userEmail.split('@')[0];

  const html = emailLayout(
    `<div style="padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:16px;">✉️</div>
        <h1 style="margin:0 0 12px 0;font-size:26px;font-weight:800;color:#f1f5f9;">Verify Your Email</h1>
        <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.6;">Hi ${name}, please verify your email address to activate your SponsiWise account.</p>
      </div>

      <div style="background:#0f172a;border-radius:10px;border:1px solid #334155;padding:24px;margin-bottom:24px;">
        <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Email Address</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#f1f5f9;">${data.userEmail}</p>
      </div>

      <p style="font-size:15px;color:#cbd5e1;line-height:1.7;margin:0 0 24px 0;">
        Click the button below to verify your email. This link will expire in <strong style="color:#f1f5f9;">24 hours</strong>.
      </p>

      ${ctaButton('Verify Email Address', data.verificationUrl, 'purple')}

      <div style="background:#0c1a2e;border-radius:8px;border:1px solid #1d4ed8;padding:16px;margin-top:24px;">
        <p style="margin:0;font-size:13px;color:#93c5fd;line-height:1.6;">
          🔒 If you didn't create a SponsiWise account, you can safely ignore this email.
        </p>
      </div>
    </div>`,
    `Verify your email for SponsiWise`,
  );

  return {
    subject: '✉️ Verify Your Email — SponsiWise',
    html,
    text: `Hi ${name},\n\nPlease verify your email address: ${data.userEmail}\n\nClick here: ${data.verificationUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create a SponsiWise account, ignore this email.`,
  };
}
