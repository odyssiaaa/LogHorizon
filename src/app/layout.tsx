import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Providers } from "@/components/providers";
import { HorizonChatWidget } from "@/components/horizon-chat-widget";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F9FA" },
    { media: "(prefers-color-scheme: dark)", color: "#08060B" },
  ],
};

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://loghorizon.vercel.app"),
  title: "LogHorizon | Find Your Party",
  description: "Satu guild untuk semua petualang.",
  icons: { icon: "/loghorizon-logo.png", apple: "/loghorizon-logo.png" },
  openGraph: {
    title: "LogHorizon | Find Your Party",
    description: "Satu guild untuk semua petualang.",
    images: [{ url: "/loghorizon-logo.png", width: 768, height: 768, alt: "Logo LogHorizon" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LogHorizon | Find Your Party",
    description: "Satu guild untuk semua petualang.",
    images: ["/loghorizon-logo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased dark overflow-x-hidden max-w-full w-full`}>
      <body className="min-h-full w-full max-w-full overflow-x-hidden flex flex-col bg-[#F8F9FA] text-[#111827] dark:bg-[#08060B] dark:text-white">
        <Providers>
          <Navbar />
          <div className="flex-1 w-full max-w-full overflow-x-hidden">
            {children}
          </div>
          <footer className="border-t border-gray-200 dark:border-[#211C2B] bg-white/50 dark:bg-[#0A0710]/80 py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left pr-4 sm:pr-20">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  © 2026 LogHorizon. All rights reserved.
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                  Find your party. Beyond the horizon.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                <Link href="/" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Home
                </Link>
                <Link href="/forum" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Forum
                </Link>
                <Link href="/marketplace" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Marketplace
                </Link>
                <Link href="/leaderboard" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Leaderboard
                </Link>
                <Link href="/news" className="text-purple-600 dark:text-purple-400 font-bold hover:underline">
                  News
                </Link>
                <Link href="/events" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Events
                </Link>
                <Link href="/donate" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Donate
                </Link>
                <Link href="/#rules" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Rules
                </Link>
                <Link href="/privacy" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Terms
                </Link>
                <span className="text-gray-300 dark:text-gray-700 hidden sm:inline">|</span>
                <a href="https://discord.gg/aJvbVyTxNb" target="_blank" rel="noreferrer" className="text-[#5865F2] hover:underline font-semibold transition-colors">
                  Discord Guild
                </a>
              </div>
            </div>
          </footer>
          <HorizonChatWidget />
        </Providers>
      </body>
    </html>
  );
}
