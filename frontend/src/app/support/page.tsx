import Link from 'next/link';
import { ShellPage, ShellPageHeader } from '@/components';

export default function SupportPage() {
    return (
        <ShellPage width="narrow">
            <ShellPageHeader
                eyebrow="Support"
                title="Need help?"
                subtitle="If playback, login, billing, or device management is giving you trouble, here is the fastest way to reach us."
            />

            <section className="glass-panel utility-panel info-prose">
                <p><strong>Last Updated:</strong> March 14, 2026</p>

                <h2>Contact support</h2>
                <p>
                    If you are having trouble with playback, login, account settings, or any app feature, contact us at <strong>support@nolimitflix.com</strong>.
                </p>

                <h2>What to include</h2>
                <ul>
                    <li>Email: <strong>support@nolimitflix.com</strong></li>
                    <li>Include your device model, OS version, and app version when possible.</li>
                    <li>For account issues, include the email linked to your account.</li>
                </ul>

                <h2>Report an issue in-app</h2>
                <p>
                    You can also report issues directly from{' '}
                    <Link href="/settings" style={{ color: '#FFD26F', textDecoration: 'none' }}>
                        Settings
                    </Link>
                    .
                </p>
            </section>
        </ShellPage>
    );
}
