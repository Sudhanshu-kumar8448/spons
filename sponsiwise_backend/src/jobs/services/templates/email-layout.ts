/**
 * Base HTML layout for all SponsiWise transactional emails.
 *
 * Renders a dark-branded wrapper with a header, content slot,
 * and a footer — works in all modern email clients.
 */
export function emailLayout(content: string, previewText = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SponsiWise</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;&#8203;&#65279;&#847;&#847;&#847;</div>` : ''}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0f172a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 24px 0;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:12px 12px 0 0;padding:28px 32px;">
                <tr>
                  <td style="text-align:center;">
                    <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;margin-bottom:8px;">
                      <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Sponsi<span style="color:#fbbf24;">Wise</span></span>
                    </div>
                    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;">Sponsorship Intelligence Platform</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#1e293b;border-radius:0 0 12px 12px;border:1px solid #334155;border-top:none;padding:0;">
              ${content}

              <!-- Footer -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #334155;">
                <tr>
                  <td style="padding:24px 32px;text-align:center;">
                    <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;">© ${new Date().getFullYear()} SponsiWise. All rights reserved.</p>
                    <p style="margin:0;font-size:12px;color:#475569;">You received this email because of your account activity on SponsiWise.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Renders a standard pill / badge chip.
 */
export function badge(text: string, color: 'green' | 'red' | 'amber' | 'blue' | 'purple' = 'blue'): string {
  const palettes = {
    green: 'background:#052e16;color:#4ade80;border:1px solid #166534;',
    red: 'background:#1f0a0a;color:#f87171;border:1px solid #991b1b;',
    amber: 'background:#1c1407;color:#fbbf24;border:1px solid #92400e;',
    blue: 'background:#0c1a2e;color:#60a5fa;border:1px solid #1d4ed8;',
    purple: 'background:#160a2e;color:#a78bfa;border:1px solid #5b21b6;',
  };
  return `<span style="display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;${palettes[color]}">${text}</span>`;
}

/**
 * Renders a key-value info row inside a table.
 */
export function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #1e293b;font-size:13px;font-weight:600;color:#94a3b8;width:40%;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #1e293b;font-size:14px;color:#e2e8f0;">${value}</td>
  </tr>`;
}

/**
 * Renders a CTA button.
 */
export function ctaButton(text: string, url: string, color: 'purple' | 'green' | 'blue' = 'purple'): string {
  const bg = { purple: '#7c3aed', green: '#059669', blue: '#2563eb' }[color];
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 0 auto;">
    <tr>
      <td style="border-radius:8px;background:${bg};">
        <a href="${url}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${text}</a>
      </td>
    </tr>
  </table>`;
}
