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
  actionUrl: string;
  actionLabel?: string;
  churchName?: string;
  eyebrow?: string;
  previewText?: string;
};

export function renderShepherdNotificationEmail({
  title,
  detail,
  actionUrl,
  actionLabel = "Open Shepherd",
  churchName = "Shepherd",
  eyebrow = "Shepherd Notification",
  previewText,
}: ShepherdNotificationEmailOptions) {
  const safeTitle = escapeHtml(title);
  const safeDetail = escapeHtml(detail);
  const safeChurch = escapeHtml(churchName || "Shepherd");
  const safeEyebrow = escapeHtml(eyebrow || "Shepherd Notification");
  const safePreview = escapeHtml(previewText || `${title} - ${detail}`);
  const safeActionLabel = escapeHtml(actionLabel);
  const safeActionUrl = escapeHtml(actionUrl);

  return `
    <!doctype html>
    <html>
	      <head>
	        <meta charset="utf-8">
	        <meta name="viewport" content="width=device-width, initial-scale=1">
	        <meta name="color-scheme" content="dark">
	        <meta name="supported-color-schemes" content="dark">
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
	          a {
	            color-scheme: dark;
	          }
	          body {
	            margin: 0 !important;
	            padding: 0 !important;
	            background-color: #0f131d !important;
	          }
	          a {
	            color: #10131b;
	          }
	          @media (prefers-color-scheme: light) {
	            body,
	            .shepherd-page {
	              background-color: #0f131d !important;
	            }
	            .shepherd-card {
	              background-color: #171d2b !important;
	              border-color: #2a3448 !important;
	            }
	            .shepherd-panel {
	              background-color: #111723 !important;
	              border-color: #2b3547 !important;
	            }
	            .shepherd-text {
	              color: #f2f4f8 !important;
	            }
	            .shepherd-muted {
	              color: #8f9aad !important;
	            }
	            .shepherd-title {
	              color: #f8efe1 !important;
	            }
	            .shepherd-gold {
	              color: #c9a84c !important;
	            }
	          }
	        </style>
	      </head>
	      <body bgcolor="#0f131d" style="margin:0!important;padding:0!important;background:#0f131d!important;background-color:#0f131d!important;color:#f2f4f8!important;">
	        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
	          ${safePreview}
	        </div>
	        <table class="shepherd-page" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#0f131d" style="background:#0f131d!important;background-color:#0f131d!important;margin:0;padding:32px 14px;font-family:Arial,Helvetica,sans-serif;color:#f2f4f8!important;">
	          <tr>
	            <td align="center" bgcolor="#0f131d" style="background:#0f131d!important;background-color:#0f131d!important;">
	              <table class="shepherd-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#171d2b" style="max-width:620px;background:#171d2b!important;background-color:#171d2b!important;border:1px solid #2a3448;border-radius:24px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.35);">
	                <tr>
	                  <td bgcolor="#151a27" style="padding:28px 30px 20px;background:#151a27;background-image:linear-gradient(135deg,#20283a 0%,#151a27 58%,#2d2614 100%);border-bottom:1px solid #2a3448;">
	                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
	                      <tr>
	                        <td>
	                          <div style="display:inline-block;width:38px;height:38px;border-radius:12px;background:#c9a84c;color:#111827;text-align:center;line-height:38px;font-weight:800;font-size:18px;margin-bottom:14px;">S</div>
	                          <div class="shepherd-gold" style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#c9a84c!important;font-weight:700;margin-bottom:8px;">${safeEyebrow}</div>
	                          <h1 class="shepherd-title" style="margin:0;color:#f8efe1!important;font-size:30px;line-height:1.15;font-family:Georgia,'Times New Roman',serif;font-weight:500;">${safeTitle}</h1>
	                        </td>
	                      </tr>
	                    </table>
	                  </td>
	                </tr>
	                <tr>
	                  <td bgcolor="#171d2b" style="padding:28px 30px 10px;background:#171d2b!important;background-color:#171d2b!important;">
	                    <div class="shepherd-panel" style="background:#111723!important;background-color:#111723!important;border:1px solid #2b3547;border-radius:18px;padding:20px 22px;">
	                      <p class="shepherd-text" style="margin:0;color:#f2f4f8!important;font-size:16px;line-height:1.65;">${safeDetail}</p>
	                    </div>
	                  </td>
	                </tr>
	                <tr>
	                  <td bgcolor="#171d2b" style="padding:8px 30px 4px;background:#171d2b!important;background-color:#171d2b!important;">
	                    <table class="shepherd-panel" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#121826" style="background:#121826!important;background-color:#121826!important;border:1px solid #2a3448;border-radius:16px;">
	                      <tr>
	                        <td style="padding:14px 16px;">
	                          <div class="shepherd-muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#8f9aad!important;font-weight:700;margin-bottom:4px;">Church</div>
	                          <div class="shepherd-title" style="font-size:14px;color:#f4ead4!important;font-weight:700;">${safeChurch}</div>
	                        </td>
	                      </tr>
	                    </table>
	                  </td>
	                </tr>
	                <tr>
	                  <td bgcolor="#171d2b" style="padding:24px 30px 30px;background:#171d2b!important;background-color:#171d2b!important;">
	                    <a href="${safeActionUrl}" style="display:inline-block;background:#c9a84c;color:#10131b;text-decoration:none;padding:13px 18px;border-radius:12px;font-size:14px;font-weight:800;box-shadow:0 12px 26px rgba(201,168,76,.22);">${safeActionLabel}</a>
	                    <p class="shepherd-muted" style="margin:18px 0 0;color:#8f9aad!important;font-size:12px;line-height:1.6;">
	                      You received this because something in Shepherd needs your attention. If this does not look right, open Shepherd and check your current assignments and notifications.
	                    </p>
	                  </td>
	                </tr>
	              </table>
	              <div class="shepherd-muted" style="max-width:620px;margin:16px auto 0;color:#687386!important;font-size:12px;line-height:1.6;text-align:center;">
	                Shepherd helps church teams keep tasks, events, calendar work, and operations moving together.
	              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
