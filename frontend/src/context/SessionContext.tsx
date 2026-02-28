'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface SessionUser {
    id: string;
    email: string;
    username: string;
    avatar?: string | null;
    role: string;
}

interface SessionContextType {
    user: SessionUser | null;
    loading: boolean;
    refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/auth/session', { cache: 'no-store' });
            if (!res.ok) {
                setUser(null);
                return;
            }
            const data = await res.json();
            setUser(data.user || null);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <SessionContext.Provider value={{ user, loading, refresh }}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within SessionProvider');
    }
    return context;
}
