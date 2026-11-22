import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Providers } from "@/components/providers";
import { HorizonChatWidget } from "@/components/horizon-chat-widget";
import { WelcomeOnboardingModal } from "@/components/welcome-onboarding-modal";
import { ReferralTracker } from "@/components/referral-tracker";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#11091D",
};

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://loghorizon.vercel.app"),
  title: "LogHorizon | Find Your Party",
  description: "Satu guild untuk semua petualang.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LogHorizon",
  },
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
    <html
      lang="id"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark overflow-x-hidden max-w-full w-full`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('loghorizon-theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full w-full max-w-full overflow-x-hidden flex flex-col bg-[#F8FAFC] dark:bg-[#08040E] text-[#0F172A] dark:text-[#F8FAFC] font-sans antialiased selection:bg-[#7C3AED] selection:text-white transition-colors duration-300">
        <Providers>
          <Navbar />
          <WelcomeOnboardingModal />
          <div className="flex-1 w-full max-w-full overflow-x-hidden pb-28 md:pb-12">
            {children}
          </div>
          <footer className="border-t border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#09040F] py-8 mt-auto rounded-none transition-colors duration-300">
            <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="font-display font-bold text-sm tracking-wider uppercase text-slate-900 dark:text-[#F8FAFC]">LOGHORIZON</span>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-[#10B981] px-1.5 py-0.2 bg-slate-100 dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45]">● GUILD HQ</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#A78BFA] font-mono">
                  © 2026 LogHorizon. Find your party. Beyond the horizon.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-mono text-slate-600 dark:text-[#A78BFA]">
                <Link href="/" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
                  Home
                </Link>
                <Link href="/forum" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
                  Forum
                </Link>
                <Link href="/marketplace" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
                  Marketplace
                </Link>
                <Link href="/leaderboard" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
                  Leaderboard
                </Link>
                <Link href="/news" className="text-slate-600 dark:text-[#A78BFA] hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
                  News
                </Link>
                <Link href="/events" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
                  Arena
                </Link>
                <Link href="/donate" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
                  Treasury
                </Link>
                <Link href="/rules" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
                  Aturan
                </Link>
                <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
                  Terms
                </Link>
                <span className="text-slate-300 dark:text-[#2E1E45] hidden sm:inline">|</span>
                <a
                  href="https://discord.gg/aJvbVyTxNb"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#7C3AED] dark:text-[#A78BFA] hover:text-[#6D28D9] dark:hover:text-[#F8FAFC] font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Discord Guild</span> ↗
                </a>
              </div>
            </div>
          </footer>
          <Suspense fallback={null}>
            <ReferralTracker />
          </Suspense>
          <HorizonChatWidget />
        </Providers>
      </body>
    </html>
  );
}
