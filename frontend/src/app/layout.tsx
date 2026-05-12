import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar, AppBanner, MobileTabBar } from "@/components";
import ToastContainer from "@/components/ToastContainer";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "No Limit Flix",
  description: "Stream movies and series from a curated library, track devices and watch history, save favorites, and manage your membership from one account.",
  applicationName: "No Limit Flix",
  keywords: ["movie streaming", "series streaming", "subscription streaming", "watch history", "favorites", "curated library"],
  authors: [{ name: "No Limit Flix" }],
  openGraph: {
    type: "website",
    title: "No Limit Flix",
    description: "Subscription streaming with a curated library, device-aware accounts, favorites, and watch progress across screens.",
    siteName: "No Limit Flix",
  },
  twitter: {
    card: "summary_large_image",
    title: "No Limit Flix",
    description: "Subscription streaming with curated movies, favorites, watch history, and account-managed access.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0B0B0D",
};

import { SearchProvider } from "@/context/SearchContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { CardViewProvider } from "@/context/CardViewContext";
import { SessionProvider } from "@/context/SessionContext";

// ... (keep metadata exports)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <GoogleAnalytics />
      </head>
      <body className="antialiased">
        <CardViewProvider>
          <SessionProvider>
            <SearchProvider>
              <FavoritesProvider>
                <Navbar />
                <AppBanner />
                {children}
                <Suspense fallback={null}>
                  <MobileTabBar />
                </Suspense>
                <ToastContainer />
              </FavoritesProvider>
            </SearchProvider>
          </SessionProvider>
        </CardViewProvider>
      </body>
    </html>
  );
}
