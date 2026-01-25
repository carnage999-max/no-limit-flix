'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { MoviePick, AIPickRequest } from '@/types';

type SearchMode = 'vibe' | 'title' | 'actor';
type ViewSize = 'compact' | 'standard' | 'large';

interface SearchState {
    searchMode: SearchMode;
    setSearchMode: (mode: SearchMode) => void;
    selectedMoods: string[];
    setSelectedMoods: (moods: string[] | ((prev: string[]) => string[])) => void;
    vibeText: string;
    setVibeText: (text: string) => void;
    isInterpreting: boolean;
    setIsInterpreting: (val: boolean) => void;
    adjustments: AIPickRequest['adjustments'];
    setAdjustments: (adj: AIPickRequest['adjustments']) => void;
    searchParams: AIPickRequest['searchParams'];
    setSearchParams: (params: AIPickRequest['searchParams']) => void;
    isLoading: boolean;
    setIsLoading: (val: boolean) => void;
    results: { hero: MoviePick; alternates: MoviePick[]; explanationTokens?: string[] } | null;
    setResults: (results: { hero: MoviePick; alternates: MoviePick[]; explanationTokens?: string[] } | null) => void;
    sessionId: string | null;
    setSessionId: (id: string | null) => void;
    viewSize: ViewSize;
    setViewSize: (size: ViewSize) => void;
}

const SearchContext = createContext<SearchState | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
    const [searchMode, setSearchMode] = useState<SearchMode>('vibe');
    const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
    const [vibeText, setVibeText] = useState('');
    const [isInterpreting, setIsInterpreting] = useState(false);
    const [adjustments, setAdjustments] = useState<AIPickRequest['adjustments']>({});
    const [searchParams, setSearchParams] = useState<AIPickRequest['searchParams']>({});
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<{ hero: MoviePick; alternates: MoviePick[]; explanationTokens?: string[] } | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [viewSize, setViewSize] = useState<ViewSize>('standard');

    return (
        <SearchContext.Provider value={{
            searchMode, setSearchMode,
            selectedMoods, setSelectedMoods,
            vibeText, setVibeText,
            isInterpreting, setIsInterpreting,
            adjustments, setAdjustments,
            searchParams, setSearchParams,
            isLoading, setIsLoading,
            results, setResults,
            sessionId, setSessionId,
            viewSize, setViewSize
        }}>
            {children}
        </SearchContext.Provider>
    );
}

export function useSearch() {
    const context = useContext(SearchContext);
    if (context === undefined) {
        throw new Error('useSearch must be used within a SearchProvider');
    }
    return context;
}
