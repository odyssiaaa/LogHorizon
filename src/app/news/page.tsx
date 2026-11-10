import type { Metadata } from "next";
import { NewsHub } from "@/components/news-hub";

export const metadata: Metadata = {
  title: "Guild News Hub — Warta Gaming & Tech Terkini",
  description: "Transmisi berita seputar game, turnamen esports, dan inovasi teknologi komputasi bagi petualang komunitas LogHorizon.",
};

export const dynamic = "force-dynamic";

export default function NewsPage() {
  return <NewsHub />;
}
