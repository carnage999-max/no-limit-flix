'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type CardViewSize = 'compact' | 'standard' | 'large';

interface CardViewState {
    viewSize: CardViewSize;
    setViewSize: (size: CardViewSize) => void;
}

const CardViewContext = createContext<CardViewState | undefined>(undefined);
const STORAGE_KEY = 'nlf-card-view-size';

export function CardViewProvider({ children }: { children: React.ReactNode }) {
    const [viewSize, setViewSize] = useState<CardViewSize>('compact');

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'compact' || stored === 'standard' || stored === 'large') {
            setViewSize(stored);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, viewSize);
    }, [viewSize]);

    return (
        <CardViewContext.Provider value={{ viewSize, setViewSize }}>
            {children}
        </CardViewContext.Provider>
    );
}

export function useCardView() {
    const context = useContext(CardViewContext);
    if (!context) {
        throw new Error('useCardView must be used within a CardViewProvider');
    }
    return context;
}
