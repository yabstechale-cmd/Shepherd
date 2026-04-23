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
<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
  <head>
    <title>${safeTitle}</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <!--[if mso]>
      <xml>
        <w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word"><w:DontUseAdvancedTypographyReadingMail/></w:WordDocument>
        <o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings>
      </xml>
    <![endif]-->
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; }
      a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
      #MessageViewBody a { color: inherit; text-decoration: none; }
      p { line-height: inherit; }
      @media (max-width:725px) {
        .row-content { width: 100% !important; }
        .stack .column { width: 100% !important; display: block !important; }
        .brand-copy h1 { font-size: 13px !important; line-height: 1.4 !important; text-align: center !important; }
        .title-copy h1 { font-size: 25px !important; }
        .detail-pad { padding-left: 20px !important; padding-right: 20px !important; }
      }
    </style>
  </head>
  <body class="body" style="background-color:#161b27;margin:0;padding:0;-webkit-text-size-adjust:none;text-size-adjust:none;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${safePreview}
    </div>
    <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#161b27;mso-table-lspace:0pt;mso-table-rspace:0pt;">
      <tbody>
        <tr>
          <td>
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td>
                  <table class="row-content stack" align="center" width="705" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000000;width:705px;margin:0 auto;">
                    <tr>
                      <td class="column" width="25%" style="font-weight:400;text-align:left;vertical-align:top;padding:5px 0;">
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                          <tr>
                            <td align="center" style="padding:0;">
                              <div style="max-width:88px;">
                                <img src="https://media.beefree.cloud/pub/bfra/0re6vywr/rbv/mrb/cml/shepherd-s-mark-card-bg.svg" style="display:block;height:auto;border:0;width:100%;" width="88" alt="Shepherd" title="Shepherd">
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td class="column brand-copy" width="75%" style="font-weight:400;text-align:left;vertical-align:top;padding:5px 0;">
                        <table width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation">
                          <tr>
                            <td>
                              <h1 style="margin:0;color:#c9a84c;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;letter-spacing:2px;line-height:3;text-align:left;">
                                ${safeEyebrow}
                              </h1>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td>
                  <table class="row-content stack" align="center" width="705" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#1c2333;color:#000000;width:705px;margin:0 auto;">
                    <tr>
                      <td class="column title-copy" width="100%" style="font-weight:400;text-align:left;vertical-align:top;padding:30px 0 35px;">
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                          <tr>
                            <td style="padding-left:40px;padding-right:10px;text-align:center;width:100%;">
                              <h1 style="margin:0;color:#ffffff;font-family:TimesNewRoman,'Times New Roman',Times,Baskerville,Georgia,serif;font-size:44px;font-weight:700;letter-spacing:normal;line-height:1.2;text-align:left;">
                                ${safeTitle}
                              </h1>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px;">
                              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                                <tr>
                                  <td style="font-size:1px;line-height:1px;border-top:1px solid #c9a84c;">&#8202;</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#161b27;">
              <tr>
                <td>
                  <table class="row-content stack" align="center" width="705" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#1c2333;color:#000000;width:705px;margin:0 auto;">
                    <tr>
                      <td class="column detail-pad" width="100%" style="font-weight:400;text-align:left;vertical-align:top;padding:10px 40px 45px;">
                        <h3 style="margin:0;color:#c9a84c;font-family:'Source Sans Pro',Tahoma,Verdana,Segoe,sans-serif;font-size:26px;font-weight:400;letter-spacing:1px;line-height:1.2;text-align:left;">ITEM</h3>
                        <div style="height:26px;line-height:26px;font-size:1px;">&#8202;</div>
                        <p style="margin:0;color:#d9d2c7;font-family:'Source Sans Pro',Tahoma,Verdana,Segoe,sans-serif;font-size:20px;font-weight:400;line-height:1.35;text-align:left;">
                          ${safeDetail}
                        </p>
                        <div style="height:22px;line-height:22px;font-size:1px;">&#8202;</div>
                        <h3 style="margin:0;color:#c9a84c;font-family:'Source Sans Pro',Tahoma,Verdana,Segoe,sans-serif;font-size:20px;font-weight:600;letter-spacing:1px;line-height:1.2;text-align:left;">CHURCH</h3>
                        <p style="margin:6px 0 28px;color:#d9d2c7;font-family:'Source Sans Pro',Tahoma,Verdana,Segoe,sans-serif;font-size:18px;font-weight:400;line-height:1.35;text-align:left;">
                          ${safeChurch}
                        </p>
                        <div align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeActionUrl}" style="height:42px;width:144px;v-text-anchor:middle;" arcsize="10%" fillcolor="#c9a84c">
                            <w:anchorlock/>
                            <center style="color:#161b27;font-family:Tahoma,Verdana,sans-serif;font-size:16px;">${safeActionLabel}</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-- -->
                          <a href="${safeActionUrl}" style="background-color:#c9a84c;border-radius:4px;color:#161b27;display:inline-block;font-family:'Source Sans Pro',Tahoma,Verdana,Segoe,sans-serif;font-size:16px;font-weight:400;text-align:center;text-decoration:none;padding:9px 20px;line-height:24px;">
                            ${safeActionLabel}
                          </a>
                          <!--<![endif]-->
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td>
                  <table class="row-content stack" align="center" width="705" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#1c2333;color:#000000;width:705px;margin:0 auto;">
                    <tr>
                      <td style="padding:10px;">
                        <h3 style="margin:0;color:#c9a84c;font-family:TimesNewRoman,'Times New Roman',Times,Baskerville,Georgia,serif;font-size:15px;font-weight:300;line-height:1.2;text-align:left;">
                          You received this because something in Shepherd needs your attention. If this does not look right, open Shepherd and check your current assignments and notifications.
                        </h3>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                          <tr>
                            <td style="font-size:1px;line-height:1px;border-top:1px solid #c9a84c;">&#8202;</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 10px 50px;">
                        <p style="margin:0;color:#a8a0a0;font-family:TimesNewRoman,'Times New Roman',Times,Baskerville,Georgia,serif;font-size:14px;font-weight:400;line-height:1.5;text-align:left;">
                          Shepherd helps church teams keep tasks, events, calendar work, and operations moving together.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
  `;
}
