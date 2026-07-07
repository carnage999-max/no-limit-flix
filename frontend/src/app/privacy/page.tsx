import { ShellPage, ShellPageHeader } from '@/components';

export default function PrivacyPage() {
    return (
        <ShellPage width="narrow">
            <ShellPageHeader
                eyebrow="Policy"
                title="Privacy Policy"
                subtitle="How No Limit Flix collects, uses, and protects information across discovery, streaming, and account features."
            />

            <section className="glass-panel utility-panel info-prose">
                <p><strong>Last Updated:</strong> March 3, 2026</p>

                <h2>Introduction</h2>
                <p>
                    This Privacy Policy explains how <strong>No Limit Flix</strong> collects, uses, and protects information when you use our website and mobile applications.
                    We are a streaming and discovery platform that delivers content directly from our infrastructure. Playback is limited to titles we upload ourselves or titles we
                    source from public-domain or otherwise authorized libraries.
                </p>

                <h2>Information We Collect</h2>
                <ul>
                    <li><strong>Account information:</strong> email, username, password hash, and profile image when provided.</li>
                    <li><strong>Session and device data:</strong> device identifiers, device name, app version, OS version, IP address, and approximate location for security.</li>
                    <li><strong>Watch activity:</strong> watch history, watch progress, and continue-watching state.</li>
                    <li><strong>Preferences:</strong> moods, genres, and content preferences used for recommendations.</li>
                    <li><strong>Support submissions:</strong> issue reports, optional attachments, and any contact details you provide.</li>
                </ul>

                <h2>How We Use Information</h2>
                <p>
                    We use your information to provide streaming and discovery features, personalize recommendations, secure accounts, and improve performance. This includes
                    remembering watch progress across devices, enabling favorites, and sending service-related emails such as security alerts and account updates.
                </p>

                <h2>Disclosure and Data Sharing</h2>
                <p>We do <strong>not sell</strong> personal data. We share data only with service providers that help us run the platform, including infrastructure, email, metadata providers, and authorized public sources.</p>

                <h2>Your Choices and Rights</h2>
                <p>
                    You can update your profile, manage devices, and request account deletion at any time. You may also request access, correction, or deletion of your data by contacting <strong>support@nolimitflix.com</strong>.
                </p>

                <h2>Security</h2>
                <p>
                    We use industry-standard security controls, including encryption in transit, secure storage, and access controls. No method of transmission or storage is completely secure, but we continually improve our safeguards.
                </p>

                <h2>Contact Us</h2>
                <p>For privacy questions or requests, contact <strong>support@nolimitflix.com</strong>.</p>
            </section>
        </ShellPage>
    );
}
