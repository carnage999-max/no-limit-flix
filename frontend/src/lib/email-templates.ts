const baseStyles = {
    fontFamily: 'font-family: Arial, sans-serif;',
    bg: 'background-color: #0B0B0D;',
    cardBg: 'background-color: #111114;',
    text: 'color: #F3F4F6;',
    muted: 'color: #A7ABB4;',
    gold: 'color: #D4AF37;',
    border: 'border: 1px solid rgba(212, 175, 55, 0.25);',
};

const wrapEmail = (title: string, body: string) => {
    return `
        <div style="${baseStyles.fontFamily} ${baseStyles.bg} padding: 32px;">
          <div style="max-width: 560px; margin: 0 auto; ${baseStyles.cardBg} ${baseStyles.border} border-radius: 16px; padding: 28px;">
            <div style="text-transform: uppercase; letter-spacing: 0.2em; font-size: 11px; ${baseStyles.gold}; font-weight: 700;">
              No Limit Flix
            </div>
            <h1 style="margin: 12px 0 12px; font-size: 24px; ${baseStyles.text}; font-weight: 700;">${title}</h1>
            <div style="font-size: 14px; line-height: 1.6; ${baseStyles.text};">
              ${body}
            </div>
            <div style="margin-top: 24px; font-size: 12px; ${baseStyles.muted};">
              If you did not initiate this, please contact support.
            </div>
          </div>
        </div>
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
