import { ShellPage, ShellPageHeader } from '@/components';

export default function TermsPage() {
    return (
        <ShellPage width="narrow">
            <ShellPageHeader
                eyebrow="Policy"
                title="Terms of Service"
                subtitle="Rules, rights, and responsibilities for using No Limit Flix across discovery, account, and streaming features."
            />

            <section className="glass-panel utility-panel info-prose">
                <p><strong>Last Updated:</strong> March 3, 2026</p>

                <h2>Acceptance of Terms</h2>
                <p>By accessing or using No Limit Flix, you agree to be bound by these Terms of Service. If you do not agree, do not use the Services.</p>

                <h2>Description of the Service</h2>
                <p>
                    No Limit Flix provides a streaming and discovery experience. Content available for playback through the service is delivered directly from our infrastructure
                    and is limited to titles we upload ourselves or titles we source from public-domain or otherwise authorized libraries.
                </p>

                <h2>Eligibility and Accounts</h2>
                <p>
                    You must be at least 13 years old to use the services. You are responsible for maintaining the confidentiality of your account and all activities under it.
                    We may limit the number of active devices per account.
                </p>

                <h2>Content Rights and Attribution</h2>
                <p>
                    Some titles are sourced from public-domain or otherwise authorized libraries and are provided with attribution, source references, and license metadata where applicable.
                    You may not copy, redistribute, or exploit content outside of the services without proper rights.
                </p>

                <h2>Acceptable Use</h2>
                <p>
                    You agree not to misuse the services, including attempting to bypass security, scrape content, reverse engineer the app, or use the platform for unlawful activity.
                </p>

                <h2>Disclaimer and Liability</h2>
                <p>
                    The services are provided &quot;as is&quot; and &quot;as available.&quot; We do not guarantee uninterrupted streaming or availability of any title at any time.
                    To the maximum extent permitted by law, No Limit Flix shall not be liable for indirect, incidental, or consequential damages arising from use of the services.
                </p>

                <h2>Copyright Complaints</h2>
                <p>If you believe content on the service infringes your rights, contact <strong>support@nolimitflix.com</strong> with enough detail to identify the content.</p>
            </section>
        </ShellPage>
    );
}
