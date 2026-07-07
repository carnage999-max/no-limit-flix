import { ShellPage, ShellPageHeader } from '@/components';

export default function AboutPage() {
    return (
        <ShellPage width="narrow">
            <ShellPageHeader
                eyebrow="About"
                title="About No Limit Flix"
                subtitle="A calmer way to decide what to watch, with discovery and a permanent-library feel."
            />

            <section className="glass-panel utility-panel info-prose">
                <p>
                    <strong>No Limit Flix is a discovery platform for deciding what to watch fast, calmly, and with confidence.</strong>
                </p>

                <p>
                    Modern streaming has a problem: too many options, too much scrolling, and content that disappears without warning.
                    No Limit Flix was built to remove that friction.
                </p>

                <p>
                    Instead of endless rows and noisy recommendations, No Limit Flix focuses on <strong>mood, permanence, and explainability</strong>.
                    You tell us how you&apos;re feeling or what you enjoyed, and the platform surfaces titles that feel right with a clear explanation of why they fit.
                </p>

                <p>
                    No Limit Flix combines discovery with a curated streaming library. Titles available for playback in the service are either uploaded by us directly or sourced
                    from public-domain or otherwise authorized libraries with attribution and rights metadata.
                </p>

                <h2>What makes No Limit Flix different</h2>
                <ul>
                    <li><strong>Mood-first discovery</strong> instead of genre overload</li>
                    <li><strong>Explainable recommendations</strong> instead of black-box picks</li>
                    <li><strong>Calm, premium design</strong> that reduces decision fatigue</li>
                    <li><strong>Session-based intelligence</strong> rather than long-term emotional profiling</li>
                    <li><strong>Respect for permanence</strong> through stable, curated collections</li>
                </ul>

                <p>
                    No Limit Flix is designed for people who want to spend less time searching and more time enjoying the right content.
                </p>
            </section>
        </ShellPage>
    );
}
