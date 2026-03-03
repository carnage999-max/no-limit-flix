import React from 'react';

export default function TermsPage() {
  const lastUpdated = "March 3, 2026";

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#D4AF37] to-[#F4E5A0] bg-clip-text text-transparent">
          Terms of Service
        </h1>
        <p className="text-[#A7ABB4] mb-12">Last Updated: {lastUpdated}</p>

        <div className="prose prose-invert prose-lg max-w-none space-y-12">
          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">1. Acceptance of Terms</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              By accessing or using No Limit Flix®, you agree to be bound by these Terms of Service. If you do not agree, do not use the Services.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">2. Description of the Service</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              No Limit Flix® provides a streaming and discovery experience. Content may be delivered directly from our infrastructure (including S3 and CloudFront) or from
              public sources such as Internet Archive. Availability of titles can change at any time.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">3. Eligibility & Accounts</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              You must be at least 13 years old to use the Services. You are responsible for maintaining the confidentiality of your account and all activities under it.
              We may limit the number of active devices per account.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">4. Content Rights & Attribution</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              Some titles are sourced from public domain libraries such as Internet Archive and are provided with appropriate attribution and license metadata. You may not
              copy, redistribute, or exploit content outside of the Services without proper rights.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">5. Acceptable Use</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              You agree not to misuse the Services, including attempting to bypass security, scrape content, reverse engineer the app, or use the platform for unlawful
              activity. We may suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">6. Third-Party Services</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              The Services may link to third-party websites or platforms. No Limit Flix® is not responsible for third-party content, availability, pricing, or policies.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">7. Intellectual Property</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              All trademarks, designs, software, and branding associated with No Limit Flix® are owned by or licensed to the Company and protected by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">8. Disclaimer</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              The Services are provided "as is" and "as available." We do not guarantee uninterrupted streaming or availability of any title at any time.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">9. Limitation of Liability</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              To the maximum extent permitted by law, No Limit Flix® shall not be liable for indirect, incidental, or consequential damages arising from use of the Services.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">10. Copyright Complaints</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              If you believe content on the Service infringes your rights, contact <strong>support@nolimitflix.com</strong> with sufficient detail to identify the content.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
