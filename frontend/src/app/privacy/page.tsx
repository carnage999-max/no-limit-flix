import React from 'react';

export default function PrivacyPage() {
  const lastUpdated = "January 30, 2026";
  
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
              This Global Privacy Policy describes how <strong>No Limit Flix®</strong> collects, uses, discloses, and safeguards personal information across all our services. 
              This policy is designed to meet or exceed global privacy standards, including GDPR, CCPA, and others.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">1. Information We Collect</h2>
            <p className="text-[#A7ABB4] leading-relaxed mb-4">
              We collect only information necessary to operate and improve the Services, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#A7ABB4]">
              <li>Basic identifiers (such as email address if provided)</li>
              <li>Device and usage data (browser type, pages viewed, interactions)</li>
              <li>Session-based preference inputs (e.g., mood selections)</li>
              <li>Voluntarily submitted communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">2. Automated and AI-Assisted Processing</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              No Limit Flix® uses AI-assisted systems to interpret user inputs and generate content recommendations. 
              These processes are session-based and do not rely on long-term behavioral profiling.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">3. Disclosure and Data Sharing</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              We do <strong>not sell</strong> personal data. Information is shared only with trusted service providers solely for operational purposes.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">4. Your Rights</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              Depending on your jurisdiction, you may have the right to access, correct, or delete your data. 
              Requests can be made to our privacy contact.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">5. Security</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              We employ industry-standard administrative and technical measures to protect your information, including encryption and access controls.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
