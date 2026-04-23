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
    <html style="margin:0!important;padding:0!important;background:#0f131d!important;background-color:#0f131d!important;color:#10131b!important;">
	      <head>
	        <meta charset="utf-8">
	        <meta name="viewport" content="width=device-width, initial-scale=1">
	        <meta name="color-scheme" content="light">
	        <meta name="supported-color-schemes" content="light">
	        <meta name="x-apple-disable-message-reformatting">
	        <title>${safeTitle}</title>
	        <style>
	          :root {
	            color-scheme: light;
	            supported-color-schemes: light;
	          }
	          body,
	          table,
	          td,
	          div,
	          p,
	          h1,
	          a {
	            color-scheme: light;
	          }
	          body {
	            margin: 0 !important;
	            padding: 0 !important;
	            width: 100% !important;
	            min-width: 100% !important;
	            background-color: #0f131d !important;
	            background: #0f131d !important;
	            color: #10131b !important;
	            -webkit-text-size-adjust: 100% !important;
	          }
	          a {
	            color: #10131b;
	          }
	          .shepherd-page,
	          [data-ogsc] .shepherd-page,
	          [data-ogsb] .shepherd-page {
	            background-color: #0f131d !important;
	            background: #0f131d !important;
	          }
	          .shepherd-card,
	          [data-ogsc] .shepherd-card,
	          [data-ogsb] .shepherd-card {
	            background-color: #171d2b !important;
	            background: #171d2b !important;
	            border-color: #2a3448 !important;
	          }
	          .shepherd-header,
	          [data-ogsc] .shepherd-header,
	          [data-ogsb] .shepherd-header {
	            background-color: #151a27 !important;
	            background: #151a27 !important;
	            background-image: linear-gradient(135deg,#20283a 0%,#151a27 58%,#2d2614 100%) !important;
	          }
	          .shepherd-text,
	          [data-ogsc] .shepherd-text,
	          [data-ogsb] .shepherd-text {
	            color: #10131b !important;
	            -webkit-text-fill-color: #10131b !important;
	          }
	          .shepherd-muted,
	          [data-ogsc] .shepherd-muted,
	          [data-ogsb] .shepherd-muted {
	            color: #4f5868 !important;
	            -webkit-text-fill-color: #4f5868 !important;
	          }
	          .shepherd-title,
	          [data-ogsc] .shepherd-title,
	          [data-ogsb] .shepherd-title {
	            color: #10131b !important;
	            -webkit-text-fill-color: #10131b !important;
	          }
	          .shepherd-gold,
	          [data-ogsc] .shepherd-gold,
	          [data-ogsb] .shepherd-gold {
	            color: #8a6f2e !important;
	            -webkit-text-fill-color: #8a6f2e !important;
	          }
	          @media (prefers-color-scheme: light) {
	            body, table, td, div, p, h1 {
	              color-scheme: light !important;
	            }
	          }
	        </style>
	      </head>
	      <body bgcolor="#0f131d" style="margin:0!important;padding:0!important;background:#0f131d!important;background-color:#0f131d!important;color:#10131b!important;">
	        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
	          ${safePreview}
	        </div>
	        <table class="shepherd-page" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#0f131d" style="background:#0f131d!important;background-color:#0f131d!important;margin:0;padding:32px 14px;font-family:Arial,Helvetica,sans-serif;color:#10131b!important;">
	          <tr>
	            <td align="center" bgcolor="#0f131d" style="background:#0f131d!important;background-color:#0f131d!important;">
	              <table class="shepherd-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#171d2b" style="max-width:620px;background:#171d2b!important;background-color:#171d2b!important;border:1px solid #2a3448;border-radius:24px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.35);">
	                <tr>
	                  <td class="shepherd-header" bgcolor="#151a27" style="padding:28px 30px 20px;background:#151a27!important;background-color:#151a27!important;background-image:linear-gradient(135deg,#20283a 0%,#151a27 58%,#2d2614 100%)!important;border-bottom:1px solid #2a3448;">
	                    <div style="display:inline-block;width:38px;height:38px;border-radius:12px;background:#c9a84c;background-color:#c9a84c;background-image:linear-gradient(#c9a84c,#c9a84c);color:#111827;text-align:center;line-height:38px;font-weight:800;font-size:18px;margin-bottom:14px;">S</div>
	                    <div class="shepherd-gold" style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#c9a84c!important;-webkit-text-fill-color:#c9a84c!important;text-shadow:0 0 0 #c9a84c!important;font-weight:700;margin-bottom:8px;">${safeEyebrow}</div>
	                    <h1 style="margin:0;color:#fff7e8!important;-webkit-text-fill-color:#fff7e8!important;text-shadow:0 0 0 #fff7e8!important;font-size:30px;line-height:1.15;font-family:Georgia,'Times New Roman',serif;font-weight:500;">
	                      ${safeTitle}
	                    </h1>
	                  </td>
	                </tr>
	                <tr>
	                  <td bgcolor="#171d2b" style="padding:28px 30px 14px;background:#171d2b!important;background-color:#171d2b!important;">
	                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f8efe1" style="background:#f8efe1!important;background-color:#f8efe1!important;border:1px solid #d9c98f;border-radius:18px;">
	                      <tr>
	                        <td bgcolor="#f8efe1" style="padding:20px 22px;background:#f8efe1!important;background-color:#f8efe1!important;">
	                          <p class="shepherd-text" style="margin:0;color:#10131b!important;-webkit-text-fill-color:#10131b!important;font-size:16px;line-height:1.65;font-weight:700;">
	                            ${safeDetail}
	                          </p>
	                        </td>
	                      </tr>
	                    </table>
	                  </td>
	                </tr>
	                <tr>
	                  <td bgcolor="#171d2b" style="padding:0 30px 10px;background:#171d2b!important;background-color:#171d2b!important;">
	                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#efe2bd" style="background:#efe2bd!important;background-color:#efe2bd!important;border:1px solid #c9a84c;border-radius:16px;">
	                      <tr>
	                        <td bgcolor="#efe2bd" style="padding:14px 16px;background:#efe2bd!important;background-color:#efe2bd!important;">
	                          <div class="shepherd-muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#5d4b1f!important;-webkit-text-fill-color:#5d4b1f!important;font-weight:800;margin-bottom:4px;">Church</div>
	                          <div class="shepherd-title" style="font-size:14px;color:#10131b!important;-webkit-text-fill-color:#10131b!important;font-weight:800;">${safeChurch}</div>
	                        </td>
	                      </tr>
	                    </table>
	                  </td>
	                </tr>
	                <tr>
	                  <td bgcolor="#171d2b" style="padding:14px 30px 30px;background:#171d2b!important;background-color:#171d2b!important;">
	                    <a href="${safeActionUrl}" style="display:inline-block;background:#c9a84c;background-color:#c9a84c;background-image:linear-gradient(#d7bb62,#c9a84c);color:#10131b;text-decoration:none;padding:13px 18px;border-radius:12px;font-size:14px;font-weight:800;box-shadow:0 12px 26px rgba(201,168,76,.22);">${safeActionLabel}</a>
	                    <p class="shepherd-muted" style="margin:18px 0 0;color:#c7cedb!important;-webkit-text-fill-color:#c7cedb!important;font-size:12px;line-height:1.6;">
	                      You received this because something in Shepherd needs your attention. If this does not look right, open Shepherd and check your current assignments and notifications.
	                    </p>
	                  </td>
	                </tr>
	              </table>
	              <div class="shepherd-muted" style="max-width:620px;margin:16px auto 0;color:#c7cedb!important;-webkit-text-fill-color:#c7cedb!important;text-shadow:0 0 0 #c7cedb!important;font-size:12px;line-height:1.6;text-align:center;">
	                Shepherd helps church teams keep tasks, events, calendar work, and operations moving together.
	              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
