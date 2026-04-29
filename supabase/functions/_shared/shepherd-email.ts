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
<html lang="en" style="margin:0!important;padding:0!important;background:#161b27!important;background-color:#161b27!important;">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Young+Serif&display=swap" rel="stylesheet">
    <title>${safeTitle}</title>
    <style>
      :root {
        color-scheme: dark;
        supported-color-schemes: dark;
      }
      body,
      table,
      td,
      div,
      p,
      h1,
      a,
      span {
        color-scheme: dark;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-width: 100% !important;
        background: #161b27 !important;
        background-color: #161b27 !important;
        -webkit-text-size-adjust: 100% !important;
        text-size-adjust: 100% !important;
      }
      .shepherd-page,
      [data-ogsc] .shepherd-page,
      [data-ogsb] .shepherd-page {
        background: #161b27 !important;
        background-color: #161b27 !important;
      }
      .shepherd-card,
      [data-ogsc] .shepherd-card,
      [data-ogsb] .shepherd-card {
        background: #1c2333 !important;
        background-color: #1c2333 !important;
        border-color: #30384c !important;
      }
      .shepherd-panel,
      [data-ogsc] .shepherd-panel,
      [data-ogsb] .shepherd-panel {
        background: #121826 !important;
        background-color: #121826 !important;
        border-color: #293144 !important;
      }
      .shepherd-title,
      [data-ogsc] .shepherd-title,
      [data-ogsb] .shepherd-title {
        color: #f6efe3 !important;
        -webkit-text-fill-color: #f6efe3 !important;
      }
      .shepherd-body,
      [data-ogsc] .shepherd-body,
      [data-ogsb] .shepherd-body {
        color: #e6edf7 !important;
        -webkit-text-fill-color: #e6edf7 !important;
      }
      .shepherd-muted,
      [data-ogsc] .shepherd-muted,
      [data-ogsb] .shepherd-muted {
        color: #9ca8bc !important;
        -webkit-text-fill-color: #9ca8bc !important;
      }
      .shepherd-gold,
      [data-ogsc] .shepherd-gold,
      [data-ogsb] .shepherd-gold {
        color: #c9a84c !important;
        -webkit-text-fill-color: #c9a84c !important;
      }
      .shepherd-button,
      [data-ogsc] .shepherd-button,
      [data-ogsb] .shepherd-button {
        background: #c9a84c !important;
        background-color: #c9a84c !important;
        color: #101521 !important;
        -webkit-text-fill-color: #101521 !important;
      }
    </style>
  </head>
  <body bgcolor="#161b27" style="margin:0!important;padding:0!important;background:#161b27!important;background-color:#161b27!important;color:#f6efe3!important;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
      ${safePreview}
    </div>
    <table class="shepherd-page" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#161b27" style="width:100%;background:#161b27!important;background-color:#161b27!important;margin:0;padding:0;border-collapse:collapse;">
      <tr>
        <td align="center" bgcolor="#161b27" style="padding:32px 14px;background:#161b27!important;background-color:#161b27!important;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;border-collapse:collapse;">
            <tr>
              <td style="padding:0;">
                <table class="shepherd-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#1c2333" style="width:100%;border-collapse:separate;background:#1c2333!important;background-color:#1c2333!important;border:1px solid #30384c;border-radius:26px;overflow:hidden;">
                  <tr>
                    <td bgcolor="#1c2333" style="padding:28px 28px 18px 28px;background:#1c2333!important;background-color:#1c2333!important;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                        <tr>
                          <td valign="middle" width="54" style="width:54px;padding:0 14px 0 0;">
                            <div style="width:42px;height:42px;border-radius:13px;background:#c9a84c!important;background-color:#c9a84c!important;color:#161b27!important;-webkit-text-fill-color:#161b27!important;font-family:'Young Serif',Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;line-height:42px;text-align:center;">S</div>
                          </td>
                          <td valign="middle" style="padding:0;">
                            <div class="shepherd-gold" style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#c9a84c!important;-webkit-text-fill-color:#c9a84c!important;">
                              ${safeEyebrow}
                            </div>
                            <div class="shepherd-title" style="font-family:'Young Serif',Georgia,'Times New Roman',serif;font-size:19px;line-height:24px;font-weight:400;color:#f6efe3!important;-webkit-text-fill-color:#f6efe3!important;margin-top:4px;">
                              Shepherd
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td bgcolor="#1c2333" style="padding:8px 28px 4px 28px;background:#1c2333!important;background-color:#1c2333!important;">
                      <h1 class="shepherd-title" style="margin:0;color:#f6efe3!important;-webkit-text-fill-color:#f6efe3!important;font-family:'Young Serif',Georgia,'Times New Roman',serif;font-size:34px;line-height:40px;font-weight:400;">
                        ${safeTitle}
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td bgcolor="#1c2333" style="padding:18px 28px 0 28px;background:#1c2333!important;background-color:#1c2333!important;">
                      <table class="shepherd-panel" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#121826" style="width:100%;background:#121826!important;background-color:#121826!important;border:1px solid #293144;border-radius:18px;border-collapse:separate;">
                        <tr>
                          <td bgcolor="#121826" style="padding:22px 22px 20px 22px;background:#121826!important;background-color:#121826!important;">
                            <div class="shepherd-gold" style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:11px;line-height:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c9a84c!important;-webkit-text-fill-color:#c9a84c!important;margin-bottom:10px;">
                              ${safeDetailLabel}
                            </div>
                            <div class="shepherd-body" style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;font-weight:400;color:#e6edf7!important;-webkit-text-fill-color:#e6edf7!important;">
                              ${renderedDetail}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td bgcolor="#1c2333" style="padding:26px 28px 12px 28px;background:#1c2333!important;background-color:#1c2333!important;">
                      <a class="shepherd-button" href="${safeActionUrl}" style="display:inline-block;background:#c9a84c!important;background-color:#c9a84c!important;color:#101521!important;-webkit-text-fill-color:#101521!important;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;text-decoration:none;border-radius:12px;padding:13px 20px;">
                        ${safeActionLabel}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td bgcolor="#1c2333" style="padding:8px 28px 30px 28px;background:#1c2333!important;background-color:#1c2333!important;">
                      <div style="height:1px;line-height:1px;background:#30384c;margin:0 0 18px 0;">&nbsp;</div>
                      <p class="shepherd-muted" style="margin:0;color:#9ca8bc!important;-webkit-text-fill-color:#9ca8bc!important;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;">
                        ${safeFooterText}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#161b27" style="padding:18px 18px 0 18px;background:#161b27!important;background-color:#161b27!important;">
                <p class="shepherd-muted" style="margin:0;color:#7f8aa0!important;-webkit-text-fill-color:#7f8aa0!important;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;">
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
