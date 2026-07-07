'use client';

import { Play, Sparkles } from 'lucide-react';

interface TabSwitchProps {
    activeTab: 'watch' | 'discovery';
    onTabChange: (tab: 'watch' | 'discovery') => void;
}

export default function TabSwitch({ activeTab, onTabChange }: TabSwitchProps) {
    const sliderLeft = activeTab === 'watch' ? '4px' : 'calc(50% + 4px)';

    return (
        <div className="top-mode-switch" role="tablist" aria-label="Mode switch">
            <div className="top-mode-switch__glow" style={{ left: sliderLeft }} />
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'watch'}
                onClick={() => onTabChange('watch')}
            >
                <Play className="w-4 h-4" />
                <span>Watch</span>
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'discovery'}
                onClick={() => onTabChange('discovery')}
            >
                <Sparkles className="w-4 h-4" />
                <span>Discovery</span>
            </button>
        </div>
    );
}
