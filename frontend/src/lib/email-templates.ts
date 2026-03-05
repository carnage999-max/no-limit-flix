const baseStyles = {
    fontFamily: 'font-family: "Inter", "Segoe UI", Arial, sans-serif;',
    bg: 'background-color: #0B0B0D;',
    cardBg: 'background-color: #111114;',
    text: 'color: #F3F4F6;',
    muted: 'color: #A7ABB4;',
    gold: 'color: #D4AF37;',
    border: 'border: 1px solid rgba(212, 175, 55, 0.22);',
};

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://nolimitflix.com').replace(/\/$/, '');
const LOGO_URL = 'https://www.nolimitflix.com/no-limit-flix-logo.png';

const wrapEmail = (title: string, body: string) => {
    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; ${baseStyles.bg}; ${baseStyles.fontFamily}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${baseStyles.bg}; padding: 24px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="${baseStyles.cardBg}; ${baseStyles.border}; border-radius: 18px; padding: 28px; width: 100%; max-width: 600px;">
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom: 16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width: 48px; height: 48px; border-radius: 12px; overflow: hidden; background: #0B0B0D;">
                            <img src="${LOGO_URL}" width="48" height="48" alt="No Limit Flix" style="display:block; width:48px; height:48px; border-radius:12px;" />
                          </td>
                          <td style="padding-left: 12px;">
                            <div style="font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; ${baseStyles.gold}; font-weight: 700;">No Limit Flix</div>
                            <div style="font-size: 13px; ${baseStyles.muted}; margin-top: 4px;">Streaming + Discovery</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <h1 style="margin: 0 0 12px; font-size: 24px; ${baseStyles.text}; font-weight: 700;">${title}</h1>
                      <div style="font-size: 14px; line-height: 1.6; ${baseStyles.text};">
                        ${body}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 20px;">
                      <div style="height: 1px; background: rgba(167, 171, 180, 0.15);"></div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 16px;">
                      <div style="font-size: 12px; ${baseStyles.muted}; line-height: 1.5;">
                        If you did not initiate this activity, please contact support immediately.
                      </div>
                      <div style="font-size: 12px; ${baseStyles.muted}; margin-top: 10px;">
                        <a href="${APP_URL}" style="color: #D4AF37; text-decoration: none;">NoLimitFlix.com</a>
                        &nbsp;&middot;&nbsp;
                        <a href="mailto:info@nolimitflix.com" style="color: #D4AF37; text-decoration: none;">Support</a>
                      </div>
                      <div style="font-size: 11px; ${baseStyles.muted}; margin-top: 8px;">
                        No Limit Flix · This email was sent to you because it relates to your account activity.
                      </div>
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
</html>
    `;
};

const buildInfoRow = (label: string, value: string) => {
    return `
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <div style="min-width: 90px; font-size: 12px; ${baseStyles.muted}; text-transform: uppercase; letter-spacing: 0.12em;">${label}</div>
          <div style="font-size: 14px; ${baseStyles.text}; font-weight: 600;">${value}</div>
        </div>
    `;
};

export const buildWelcomeEmail = () => {
    return wrapEmail(
        'Welcome to No Limit Flix',
        `
          <p style="margin: 0 0 12px;">Your account has been created successfully.</p>
          <p style="margin: 0;">Sign in and start exploring curated films, series, and discovery picks.</p>
        `
    );
};

export const buildNewDeviceEmail = (details: { device: string; ip: string; location: string }) => {
    return wrapEmail(
        'New device signed in',
        `
          <p style="margin: 0 0 12px;">We noticed a new device sign-in to your account.</p>
          ${buildInfoRow('Device', details.device)}
          ${buildInfoRow('IP', details.ip)}
          ${buildInfoRow('Location', details.location)}
        `
    );
};

export const buildBlockedDeviceEmail = (details: { device: string; ip: string; location: string }) => {
    return wrapEmail(
        'New device sign-in blocked',
        `
          <p style="margin: 0 0 12px;">We blocked a sign-in because your account has reached the maximum number of active devices.</p>
          ${buildInfoRow('Device', details.device)}
          ${buildInfoRow('IP', details.ip)}
          ${buildInfoRow('Location', details.location)}
          <p style="margin: 16px 0 0; ${baseStyles.muted};">Log out another device and try again.</p>
        `
    );
};

export const buildDeletionRequestEmail = () => {
    return wrapEmail(
        'Account deletion request received',
        `
          <p style="margin: 0 0 12px;">Your request is now in review.</p>
          <p style="margin: 0;">We’ll notify you when processing is complete.</p>
        `
    );
};

export const buildIssueReceivedEmail = (details: { issueId: string; issue: string; name?: string; email?: string }) => {
    return wrapEmail(
        'Issue report received',
        `
          <p style="margin: 0 0 12px;">We’ve received your report and our team is reviewing it.</p>
          ${buildInfoRow('Issue ID', details.issueId)}
          ${details.name ? buildInfoRow('Name', details.name) : ''}
          ${details.email ? buildInfoRow('Email', details.email) : ''}
          ${buildInfoRow('Summary', details.issue)}
          <p style="margin: 16px 0 0; ${baseStyles.muted};">We’ll follow up as soon as there’s an update.</p>
        `
    );
};

export const buildIssueResolvedEmail = (details: { issueId: string }) => {
    return wrapEmail(
        'Issue resolved',
        `
          <p style="margin: 0 0 12px;">Your reported issue has been marked as resolved.</p>
          ${buildInfoRow('Issue ID', details.issueId)}
          <p style="margin: 16px 0 0; ${baseStyles.muted};">If you still need help, reply to this email and we’ll take another look.</p>
        `
    );
};

export const buildIssueInternalEmail = (details: { issueId: string; issue: string; name?: string; email?: string; userId?: string }) => {
    return wrapEmail(
        'New issue report',
        `
          <p style="margin: 0 0 12px;">A new issue was reported in No Limit Flix.</p>
          ${buildInfoRow('Issue ID', details.issueId)}
          ${details.userId ? buildInfoRow('User ID', details.userId) : ''}
          ${details.name ? buildInfoRow('Name', details.name) : ''}
          ${details.email ? buildInfoRow('Email', details.email) : ''}
          ${buildInfoRow('Summary', details.issue)}
        `
    );
};

export const buildIssueInternalEmailWithAttachments = (details: {
    issueId: string;
    issue: string;
    name?: string;
    email?: string;
    userId?: string;
    attachments?: Array<{ name: string; url: string }>;
}) => {
    const attachmentRows = (details.attachments || [])
        .map((file) => buildInfoRow('Attachment', `<a href="${file.url}" style="color:#D4AF37; text-decoration:none;">${file.name}</a>`))
        .join('');

    return wrapEmail(
        'New issue report',
        `
          <p style="margin: 0 0 12px;">A new issue was reported in No Limit Flix.</p>
          ${buildInfoRow('Issue ID', details.issueId)}
          ${details.userId ? buildInfoRow('User ID', details.userId) : ''}
          ${details.name ? buildInfoRow('Name', details.name) : ''}
          ${details.email ? buildInfoRow('Email', details.email) : ''}
          ${buildInfoRow('Summary', details.issue)}
          ${attachmentRows}
        `
    );
};
