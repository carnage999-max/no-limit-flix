import React from 'react';

export default function TermsPage() {
  const lastUpdated = "January 30, 2026";

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
              No Limit Flix® is a <strong>content discovery platform</strong>. We do not host, stream, or sell video content. Any links to third-party streaming platforms or trailers are provided for convenience only.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">3. Third-Party Services</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              The Services may link to third-party websites or platforms. No Limit Flix® is not responsible for third-party content, availability, pricing, or policies.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">4. Intellectual Property</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              All content, trademarks, designs, and software associated with No Limit Flix® are owned by or licensed to the Company and are protected by applicable intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">5. Disclaimer</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              The Services are provided "as is" and "as available." Recommendations are informational only and do not guarantee availability or suitability of any content on third-party platforms.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">6. Limitation of Liability</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              To the maximum extent permitted by law, No Limit Flix® shall not be liable for indirect, incidental, or consequential damages arising from use of the Services.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
