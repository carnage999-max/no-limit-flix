'use client';

import React, { useState, useEffect } from 'react';

interface TabSwitchProps {
  activeTab: 'watch' | 'discovery';
  onTabChange: (tab: 'watch' | 'discovery') => void;
}

export default function TabSwitch({ activeTab, onTabChange }: TabSwitchProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const sliderLeft = activeTab === 'watch' ? '4px' : 'calc(50% + 4px)';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '2rem',
        marginTop: '1rem',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: 'rgba(167, 171, 180, 0.1)',
          borderRadius: '25px',
          padding: '4px',
          width: '260px',
          height: '50px',
        }}
      >
        {/* Animated Slider Background */}
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: sliderLeft,
            width: 'calc(50% - 4px)',
            height: '42px',
            backgroundColor: '#D4AF37',
            borderRadius: '21px',
            boxShadow: '0 4px 8px rgba(212, 175, 55, 0.3)',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1,
          }}
        />

        {/* Watch Tab */}
        <button
          onClick={() => onTabChange('watch')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            borderRadius: '21px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 2,
            transition: 'color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            color: activeTab === 'watch' ? '#0B0B0D' : '#A7ABB4',
            fontSize: '14px',
            fontWeight: '700',
          } as React.CSSProperties}
          onMouseEnter={(e) => {
            if (activeTab !== 'watch') {
              e.currentTarget.style.color = '#F3F4F6';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'watch') {
              e.currentTarget.style.color = '#A7ABB4';
            }
          }}
        >
          <span style={{ fontSize: '16px' }}>▶</span>
          Watch
        </button>

        {/* Discovery Tab */}
        <button
          onClick={() => onTabChange('discovery')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            borderRadius: '21px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 2,
            transition: 'color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            color: activeTab === 'discovery' ? '#0B0B0D' : '#A7ABB4',
            fontSize: '14px',
            fontWeight: '700',
          } as React.CSSProperties}
          onMouseEnter={(e) => {
            if (activeTab !== 'discovery') {
              e.currentTarget.style.color = '#F3F4F6';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'discovery') {
              e.currentTarget.style.color = '#A7ABB4';
            }
          }}
        >
          <span style={{ fontSize: '16px' }}>✨</span>
          Discovery
        </button>
      </div>
    </div>
  );
}
