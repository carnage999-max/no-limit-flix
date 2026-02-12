'use client';

import { useState, useEffect } from 'react';

export function AppBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed
    const dismissed = localStorage.getItem('appBannerDismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('appBannerDismissed', 'true');
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)',
        borderBottom: '1px solid rgba(167, 171, 180, 0.2)',
        padding: '0.625rem 1rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <p
          style={{
            color: '#A7ABB4',
            fontSize: '0.875rem',
            margin: 0,
            fontWeight: '500',
          }}
        >
          Download our mobile app:
        </p>
        
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          {/* Google Play */}
          <a
            href="https://play.google.com/store/apps/details?id=com.nolimitflix.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              transition: 'all 0.2s',
              opacity: 0.85,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.85';
            }}
          >
            <img
              src="/google-play.svg"
              alt="Get it on Google Play"
              style={{
                height: '1.75rem',
                width: 'auto',
              }}
            />
          </a>

          {/* App Store */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              opacity: 0.5,
            }}
            title="Coming soon"
          >
            <img
              src="/App_Store.svg"
              alt="Download on the App Store"
              style={{
                height: '1.75rem',
                width: 'auto',
              }}
            />
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#A7ABB4',
            cursor: 'pointer',
            fontSize: '1.25rem',
            padding: '0.25rem 0.5rem',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s',
            marginLeft: 'auto',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#F3F4F6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#A7ABB4';
          }}
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
