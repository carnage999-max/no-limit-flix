import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar, AppBanner } from "@/components";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "No Limit Flix — Discover Your Next Watch",
  description: "Premium mood-based movie discovery. Find what to watch, why it fits your mood, and where to watch it. Permanent library feel. No rotation.",
  keywords: ["movies", "discovery", "mood-based", "watch", "streaming", "film"],
  authors: [{ name: "No Limit Flix" }],
  openGraph: {
    type: "website",
    title: "No Limit Flix — Discover Your Next Watch",
    description: "Premium mood-based movie discovery experience",
    siteName: "No Limit Flix",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0B0B0D",
};

import { SearchProvider } from "@/context/SearchContext";
import { AuthProvider } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";

// ... (keep metadata exports)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <AuthProvider>
          <SearchProvider>
            <FavoritesProvider>
              <Navbar />
              <AppBanner />
              {children}
            </FavoritesProvider>
          </SearchProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
