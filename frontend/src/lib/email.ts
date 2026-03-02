import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const sendEmail = async (params: { to: string; subject: string; html: string }) => {
    if (!resend || !resendFrom) {
        console.warn('Email not sent (missing RESEND_API_KEY or RESEND_FROM)');
        return;
    }
    await resend.emails.send({
        from: resendFrom,
        to: params.to,
        subject: params.subject,
        html: params.html,
    });
};
