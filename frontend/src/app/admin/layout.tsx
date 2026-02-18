import React from 'react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // We already have the main Navbar from RootLayout.
    // This layout will focus on the cinematic background and center the content.
    return (
        <div className="relative min-h-screen overflow-x-hidden">
            {/* Animated Background Elements (Matching HomePage) */}
            <div className="fixed inset-0 z-[-1] opacity-20 pointer-events-none">
                <div
                    className="absolute top-[10%] left-[10%] w-[500px] h-[500px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
                        filter: 'blur(100px)',
                        animation: 'fadeIn 2s ease-out'
                    }}
                />
                <div
                    className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)',
                        filter: 'blur(120px)',
                        animation: 'fadeIn 2s ease-out 0.5s both'
                    }}
                />
            </div>

            {/* Content Area */}
            <div className="container-custom py-12 md:py-24">
                {children}
            </div>
        </div>
    );
}
