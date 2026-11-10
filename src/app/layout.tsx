import type { Metadata } from "next";
import Link from "next/link";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Providers } from "@/components/providers";
import { HorizonChatWidget } from "@/components/horizon-chat-widget";
import "./globals.css";

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
        <Providers><Navbar />{children}<footer className="site-footer"><div className="footer-inner"><div className="footer-branding"><span>© 2026 LogHorizon. All rights reserved.</span><small>Find your party. Beyond the horizon.</small></div><div className="footer-links"><Link href="/news" className="text-purple-400 hover:text-purple-300 font-semibold">News</Link><Link href="/leaderboard">Leaderboard</Link><Link href="/events">Events</Link><a href="https://discord.gg/aJvbVyTxNb" target="_blank" rel="noreferrer">Discord</a><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a><a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a></div></div></footer><HorizonChatWidget /></Providers>
      </body>
    </html>
  );
}
