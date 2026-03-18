import React from 'react';

export default function PrivacyPage() {
  const lastUpdated = "March 3, 2026";
  
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#D4AF37] to-[#F4E5A0] bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        <p className="text-[#A7ABB4] mb-12">Last Updated: {lastUpdated}</p>
        
        <div className="prose prose-invert prose-lg max-w-none space-y-12">
          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">Introduction</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              This Privacy Policy explains how <strong>No Limit Flix®</strong> collects, uses, and protects information when you use our website and mobile applications. We
              are a streaming and discovery platform that delivers content directly from our infrastructure. Playback is limited to titles we upload ourselves or titles we
              source from public-domain or otherwise authorized libraries. If you do not agree with this policy, please do not use the Services.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">1. Information We Collect</h2>
            <p className="text-[#A7ABB4] leading-relaxed mb-4">
              We collect information necessary to operate, secure, and improve the Services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#A7ABB4]">
              <li><strong>Account information:</strong> Email, username, password hash, and profile image (if provided).</li>
              <li><strong>Session & device data:</strong> Device identifiers, device name, app version, OS version, IP address, and approximate location for security and device management.</li>
              <li><strong>Watch activity:</strong> Watch history, watch progress, and “continue watching” state.</li>
              <li><strong>Preferences:</strong> Mood selections, genres, and content preferences used for recommendations.</li>
              <li><strong>Usage analytics:</strong> Aggregated product analytics and performance data (no advertising data).</li>
              <li><strong>Support submissions:</strong> Issue reports, optional attachments, and any contact details you provide.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">2. How We Use Information</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              We use your information to provide streaming and discovery features, personalize recommendations, secure accounts, and improve performance. This includes
              remembering watch progress across devices, enabling favorites, and sending service-related emails (such as security alerts or account updates).
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">3. Streaming & Content Sources</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              We stream content directly from our infrastructure. When a title is sourced from a library such as Internet Archive, we retain source metadata such as rights,
              license URLs, and source pages for attribution and compliance, and we limit playback availability to titles we believe we are authorized to distribute.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">4. Disclosure and Data Sharing</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              We do <strong>not sell</strong> personal data. We share data only with service providers that help us run the platform, such as:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#A7ABB4]">
              <li><strong>Infrastructure:</strong> AWS (S3/CloudFront) and hosting providers for content delivery.</li>
              <li><strong>Email:</strong> Resend for transactional emails.</li>
              <li><strong>Metadata providers:</strong> TMDb/OMDb for posters and metadata, when available.</li>
              <li><strong>Public sources:</strong> Internet Archive for public domain content sources.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">5. Your Choices & Rights</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              You can update your profile, manage devices, and request account deletion at any time. You may also request access, correction, or deletion of your data by
              contacting us at <strong>support@nolimitflix.com</strong>. Where applicable, we honor GDPR/CCPA rights.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">6. Data Retention</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              We retain data for as long as necessary to provide the Services, comply with legal obligations, resolve disputes, and enforce our agreements. You may request
              deletion of your account and associated data.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">7. Security</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              We use industry-standard security controls, including encryption in transit, secure storage, and access controls. No method of transmission or storage is
              completely secure, but we continually improve our safeguards.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">8. Children’s Privacy</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              The Services are not directed to children under 13. If you believe a child has provided personal information, contact us to remove it.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">9. Contact Us</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              For privacy questions or requests, contact <strong>support@nolimitflix.com</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
