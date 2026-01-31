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
              We collect only information necessary to operate and improve the Services. For our mobile application users, this is limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#A7ABB4]">
              <li><strong>Search & Preferences:</strong> Session-based inputs (mood selections and "vibe" text) used to generate recommendations.</li>
              <li><strong>Device Data:</strong> Basic information (OS version, app version) to ensure compatibility and performance.</li>
              <li><strong>App Activity:</strong> Anonymous interactions with our movie discovery engine.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">2. Mobile Data Safety & Ephemeral Processing</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              <strong>No Limit Flix® does not collect personal identifiers</strong> like your name, email address, phone number, or precise location. 
              Any "vibe" or search text you provide is processed <strong>ephemerally</strong>. This means it is used solely to generate your immediate recommendations and is not stored against a permanent user profile.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">3. Automated and AI-Assisted Processing</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              No Limit Flix® uses AI-assisted systems to interpret user inputs and generate content recommendations. 
              These processes do not rely on long-term behavioral profiling. We use industry-standard encryption (HTTPS) for all data in transit between your device and our servers.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">4. Disclosure and Data Sharing</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              We do <strong>not sell</strong> personal data. Search queries may be shared with trusted AI infrastructure partners (like OpenRouter or Google Gemini) solely for processing your request. These partners do not use this data for their own marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">5. Your Rights</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              Since we do not maintain user accounts or link data to personal identifiers, there is no "account" to manage. However, you can clear your local application cache at any time to remove your interaction history from your device.
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
