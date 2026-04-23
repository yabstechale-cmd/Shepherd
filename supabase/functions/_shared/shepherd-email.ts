export function escapeHtml(value: unknown) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

type ShepherdNotificationEmailOptions = {
  title: string;
  detail: string;
  detailHtml?: string;
  actionUrl: string;
  actionLabel?: string;
  churchName?: string;
  eyebrow?: string;
  previewText?: string;
  detailLabel?: string;
  footerText?: string;
};

export function renderShepherdNotificationEmail({
  title,
  detail,
  detailHtml,
  actionUrl,
  actionLabel = "Open Shepherd",
  churchName: _churchName = "Shepherd",
  eyebrow = "Shepherd Notification",
  previewText,
  detailLabel = "Update",
  footerText = "You received this because something in Shepherd needs your attention. If this does not look right, open Shepherd and check your current assignments and notifications.",
}: ShepherdNotificationEmailOptions) {
  const safeTitle = escapeHtml(title);
  const safeDetail = escapeHtml(detail);
  const renderedDetail = detailHtml || safeDetail;
  const safeEyebrow = escapeHtml(eyebrow || "Shepherd Notification");
  const safePreview = escapeHtml(previewText || `${title} - ${detail}`);
  const safeActionLabel = escapeHtml(actionLabel);
  const safeActionUrl = escapeHtml(actionUrl);
  const safeDetailLabel = escapeHtml(detailLabel || "Update");
  const safeFooterText = escapeHtml(footerText);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Young+Serif&display=swap" rel="stylesheet">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#161b27;color:#f6efe3;-webkit-text-size-adjust:100%;text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
      ${safePreview}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#161b27" style="width:100%;background:#161b27;margin:0;padding:0;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:32px 14px;background:#161b27;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;border-collapse:collapse;">
            <tr>
              <td style="padding:0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#1c2333" style="width:100%;border-collapse:separate;background:#1c2333;border:1px solid #30384c;border-radius:26px;overflow:hidden;">
                  <tr>
                    <td style="padding:28px 28px 18px 28px;background:#1c2333;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                        <tr>
                          <td valign="middle" width="54" style="width:54px;padding:0 14px 0 0;">
                            <div style="width:42px;height:42px;border-radius:13px;background:#c9a84c;color:#161b27;font-family:'Young Serif',Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;line-height:42px;text-align:center;">S</div>
                          </td>
                          <td valign="middle" style="padding:0;">
                            <div style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;">
                              ${safeEyebrow}
                            </div>
                            <div style="font-family:'Young Serif',Georgia,'Times New Roman',serif;font-size:19px;line-height:24px;font-weight:400;color:#f6efe3;margin-top:4px;">
                              Shepherd
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 28px 4px 28px;background:#1c2333;">
                      <h1 style="margin:0;color:#f6efe3;font-family:'Young Serif',Georgia,'Times New Roman',serif;font-size:34px;line-height:40px;font-weight:400;">
                        ${safeTitle}
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 28px 0 28px;background:#1c2333;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#121826" style="width:100%;background:#121826;border:1px solid #293144;border-radius:18px;border-collapse:separate;">
                        <tr>
                          <td style="padding:22px 22px 20px 22px;">
                            <div style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:11px;line-height:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c9a84c;margin-bottom:10px;">
                              ${safeDetailLabel}
                            </div>
                            <div style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;font-weight:400;color:#e6edf7;">
                              ${renderedDetail}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:26px 28px 12px 28px;background:#1c2333;">
                      <a href="${safeActionUrl}" style="display:inline-block;background:#c9a84c;color:#101521;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;text-decoration:none;border-radius:12px;padding:13px 20px;">
                        ${safeActionLabel}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 28px 30px 28px;background:#1c2333;">
                      <div style="height:1px;line-height:1px;background:#30384c;margin:0 0 18px 0;">&nbsp;</div>
                      <p style="margin:0;color:#9ca8bc;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;">
                        ${safeFooterText}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 18px 0 18px;">
                <p style="margin:0;color:#7f8aa0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;">
                  Shepherd helps church teams keep tasks, events, calendar work, and operations moving together.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
