'use client';

import { useState, useEffect, useCallback } from 'react';
import { Toast } from './Toast';
import type { ToastType } from './Toast';

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

// Global toast manager
let toastManager: {
    toasts: ToastItem[];
    listeners: Set<(toasts: ToastItem[]) => void>;
    add: (message: string, type: ToastType) => void;
    remove: (id: string) => void;
} = {
    toasts: [],
    listeners: new Set(),
    add: function(message: string, type: ToastType) {
        const id = Math.random().toString(36);
        const toast = { id, message, type };
        this.toasts.push(toast);
        this.listeners.forEach(listener => listener([...this.toasts]));
        
        setTimeout(() => {
            this.remove(id);
        }, 3000);
    },
    remove: function(id: string) {
        this.toasts = this.toasts.filter(t => t.id !== id);
        this.listeners.forEach(listener => listener([...this.toasts]));
    }
};

export default function ToastContainer() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        toastManager.listeners.add(setToasts);
        return () => {
            toastManager.listeners.delete(setToasts);
        };
    }, []);

    return (
        <div style={{ position: 'fixed', bottom: 0, right: 0, zIndex: 9999 }}>
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={3000}
                    onClose={() => toastManager.remove(toast.id)}
                />
            ))}
        </div>
    );
}

// Export a global function to show toasts
export function showGlobalToast(message: string, type: ToastType = 'info') {
    toastManager.add(message, type);
}
