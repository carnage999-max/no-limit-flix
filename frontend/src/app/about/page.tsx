import React from 'react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-[#D4AF37] to-[#F4E5A0] bg-clip-text text-transparent">
          About No Limit Flix®
        </h1>
        
        <div className="prose prose-invert prose-lg max-w-none">
          <p className="text-xl text-[#A7ABB4] mb-8 leading-relaxed">
            <strong>No Limit Flix® is a discovery platform for deciding what to watch—fast, calmly, and with confidence.</strong>
          </p>

          <p className="text-[#A7ABB4] mb-6 leading-relaxed">
            Modern streaming has a problem: too many options, too much scrolling, and content that disappears without warning. 
            No Limit Flix® was built to remove that friction.
          </p>

          <p className="text-[#A7ABB4] mb-6 leading-relaxed">
            Instead of endless rows and noisy recommendations, No Limit Flix® focuses on <strong className="text-white">mood, permanence, and explainability</strong>. 
            You tell us how you're feeling—or what you enjoyed—and the platform surfaces titles that <em>feel right</em>, with a clear explanation of why they fit.
          </p>

          <p className="text-[#A7ABB4] mb-8 leading-relaxed">
            No Limit Flix® does not host or stream video content. We help you discover movies and shows, explore trailers, and find where to watch them across supported services.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-6 text-[#D4AF37]">What makes No Limit Flix® different</h2>
          
          <ul className="space-y-4 text-[#A7ABB4]">
            <li className="flex items-start">
              <span className="text-[#D4AF37] mr-3">•</span>
              <span><strong className="text-white">Mood-first discovery</strong> instead of genre overload</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#D4AF37] mr-3">•</span>
              <span><strong className="text-white">Explainable recommendations</strong> — no black-box picks</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#D4AF37] mr-3">•</span>
              <span><strong className="text-white">Calm, premium design</strong> built to reduce decision fatigue</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#D4AF37] mr-3">•</span>
              <span><strong className="text-white">Session-based intelligence</strong> — no long-term emotional profiling</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#D4AF37] mr-3">•</span>
              <span><strong className="text-white">Respect for permanence</strong> — stable, curated collections</span>
            </li>
          </ul>

          <p className="text-[#A7ABB4] mt-8 leading-relaxed">
            No Limit Flix® is designed for people who want to spend less time searching and more time enjoying the right content.
          </p>
        </div>
      </div>
    </div>
  );
}
