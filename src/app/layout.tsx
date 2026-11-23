import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Providers } from "@/components/providers";
import { HorizonChatWidget } from "@/components/horizon-chat-widget";
import { WelcomeOnboardingModal } from "@/components/welcome-onboarding-modal";
import { PwaInstallModal } from "@/components/pwa-install-modal";
import { ReferralTracker } from "@/components/referral-tracker";
import { Footer } from "@/components/footer";
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
          <PwaInstallModal />
          <div className="flex-1 w-full max-w-full overflow-x-hidden pb-28 md:pb-12">
            {children}
          </div>
          <Footer />
          <Suspense fallback={null}>
            <ReferralTracker />
          </Suspense>
          <HorizonChatWidget />
        </Providers>
      </body>
    </html>
  );
}
