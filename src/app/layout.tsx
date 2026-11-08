import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Providers } from "@/components/providers";
import { HorizonChatWidget } from "@/components/horizon-chat-widget";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LogHorizon — Find Your Party",
  description: "Komunitas multi-game LogHorizon. Temukan party, forum, dan marketplace gamer.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-[#111827] dark:bg-[#08060B] dark:text-white">
        <Providers><Navbar />{children}<footer className="site-footer"><div className="footer-inner"><div className="footer-branding"><span>© 2026 LogHorizon. All rights reserved.</span><small>Find your party. Beyond the horizon.</small></div><div><a href="#join">Discord</a><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a><a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a></div></div></footer><HorizonChatWidget /></Providers>
      </body>
    </html>
  );
}
