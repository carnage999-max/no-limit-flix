import Link from 'next/link';
import React from 'react';

export default function SupportPage() {
  const lastUpdated = "March 14, 2026";

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#D4AF37] to-[#F4E5A0] bg-clip-text text-transparent">
          Support
        </h1>
        <p className="text-[#A7ABB4] mb-12">Last Updated: {lastUpdated}</p>

        <div className="prose prose-invert prose-lg max-w-none space-y-12">
          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">Need help?</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              If you are having trouble with playback, login, account settings, or any app feature,
              contact us at <strong>support@nolimitflix.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">How to contact support</h2>
            <ul className="list-disc pl-6 space-y-2 text-[#A7ABB4]">
              <li>Email: <strong>support@nolimitflix.com</strong></li>
              <li>Include your device model, OS version, and app version when possible.</li>
              <li>For account issues, include the email linked to your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">Report an issue in-app</h2>
            <p className="text-[#A7ABB4] leading-relaxed">
              You can also report issues directly in the app from{" "}
              <Link href="/settings" className="text-[#D4AF37] hover:text-[#F4E5A0] no-underline">
                Settings
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
