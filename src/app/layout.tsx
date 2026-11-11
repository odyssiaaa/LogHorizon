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
  title: "LogHorizon — Find Your Party",
  description: "Satu guild untuk semua petualang.",
  icons: { icon: "/loghorizon-logo.png", apple: "/loghorizon-logo.png" },
  openGraph: {
    title: "LogHorizon — Find Your Party",
    description: "Satu guild untuk semua petualang.",
    images: [{ url: "/loghorizon-logo.png", width: 768, height: 768, alt: "Logo LogHorizon" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LogHorizon — Find Your Party",
    description: "Satu guild untuk semua petualang.",
    images: ["/loghorizon-logo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-[#111827] dark:bg-[#08060B] dark:text-white">
        <Providers>
          <Navbar />
          <div className="flex-1 w-full max-w-full overflow-x-hidden">
            {children}
          </div>
          <footer className="border-t border-gray-200 dark:border-[#211C2B] bg-white/50 dark:bg-[#0A0710]/80 py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left pr-16 sm:pr-20">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  © 2026 LogHorizon. All rights reserved.
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                  Find your party. Beyond the horizon.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-gray-600 dark:text-gray-400">
                <Link href="/news" className="text-purple-600 dark:text-purple-400 font-bold hover:underline">
                  News
                </Link>
                <Link href="/leaderboard" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  Leaderboard
                </Link>
                <Link href="/events" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  Events
                </Link>
                <a href="https://discord.gg/aJvbVyTxNb" target="_blank" rel="noreferrer" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  Discord
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  Instagram
                </a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  YouTube
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
