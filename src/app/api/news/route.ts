import { NextResponse } from "next/server";

export type NormalizedArticle = {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  sourceName: string;
  category: string;
};

// Curated Emergency Fallback News in Indonesian (Gaming & Tech)
const CURATED_FALLBACK_ARTICLES: NormalizedArticle[] = [
  {
    id: "fallback-1",
    title: "Valve Rilis Update Besar Counter-Strike 2: Peningkatan Tickrate dan Anti-Cheat VACNet 3.0",
    description: "Pembaruan mutakhir Valve menghadirkan optimalisasi responsivitas penembakan peluru, penyesuaian ekonomi bombsite, dan deteksi cheat otomatis yang jauh lebih ketat bagi skena kompetitif.",
    url: "https://store.steampowered.com/news/app/730",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    sourceName: "Steam News",
    category: "Esports & FPS",
  },
  {
    id: "fallback-2",
    title: "Riot Games Umumkan Roadmap Turnamen Valorant Champions Tour (VCT) Asia-Pasifik",
    description: "Format liga franchise internasional diperbarui dengan babak kualifikasi Masters dan penambahan slot perwakilan tim tier 2 menuju panggung dunia turnamen penutup musim.",
    url: "https://playvalorant.com/id-id/news",
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    sourceName: "Riot Esports",
    category: "Turnamen & Game",
  },
  {
    id: "fallback-3",
    title: "NVIDIA Umumkan Kartu Grafis RTX 50-Series: Arsitektur Blackwell untuk Gamer & AI Creator",
    description: "Lini GPU generasi terbaru menawarkan efisiensi daya komputasi tinggi, teknologi DLSS 4 berbasis neural rendering, dan akselerasi ray tracing generasi terbaru untuk resolusi 4K ultra.",
    url: "https://www.nvidia.com/id-id/geforce/news",
    imageUrl: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    sourceName: "Tech Horizon",
    category: "Hardware & Tech",
  },
  {
    id: "fallback-4",
    title: "Genshin Impact & HoYoverse Siapkan Ekspansi Wilayah Baru dengan Engine Grafis Terkini",
    description: "Para petualang Teyvat akan disuguhi alur cerita arsitektural yang lebih megah, mekanik eksplorasi vertikal baru, serta optimasi framerate stabil untuk perangkat PC dan mobile.",
    url: "https://genshin.hoyoverse.com/id/news",
    imageUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    sourceName: "HoYoLAB",
    category: "RPG & Open World",
  },
  {
    id: "fallback-5",
    title: "Perkembangan Game Engine Unreal Engine 5.5: Fitur Nanite & Lumen Lebih Ringan di PC Gaming",
    description: "Epic Games merilis rilis minor revolusioner yang menurunkan beban penggunaan VRAM sekaligus meningkatkan fidelitas pencahayaan dinamis real-time pada game open world generasi berikutnya.",
    url: "https://www.unrealengine.com/news",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    sourceName: "Epic Games",
    category: "Game Dev & Tech",
  },
  {
    id: "fallback-6",
    title: "PlayStation & Steam Mengonfirmasi Deretan Judul Game Co-Op dan Multiplayer untuk Musim Liburan",
    description: "Mulai dari petualangan strategi hingga survival simulator, komunitas gamer disiapkan untuk menikmati puluhan judul mabar lintas-platform dengan integrasi voice channel modern.",
    url: "https://blog.playstation.com",
    imageUrl: "https://images.unsplash.com/photo-1612287232049-74d6f46ceef6?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    sourceName: "Gaming Insider",
    category: "Komunitas & Mabar",
  },
];

type NewsApiArticle = {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
  source?: { name?: string | null };
};

type ApiTubeArticle = {
  id?: string | number;
  title?: string | null;
  description?: string | null;
  href?: string | null;
  image?: string | null;
  published_at?: string | null;
  source?: { domain?: string | null; home_page_url?: string | null } | string;
};

export async function GET() {
  const newsApiKey = process.env.NEWSAPI_KEY;
  const apitubeKey = process.env.APITUBE_KEY;

  // 1. Coba Tarik dari NewsAPI (Primary Endpoint)
  if (newsApiKey) {
    try {
      const query = encodeURIComponent("gaming OR esports OR teknologi OR game OR playstation OR steam");
      const endpoint = `https://newsapi.org/v2/everything?q=${query}&language=id&sortBy=publishedAt&pageSize=18&apiKey=${newsApiKey}`;
      
      const response = await fetch(endpoint, {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "LogHorizon-Community/1.0" },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "ok" && Array.isArray(data.articles) && data.articles.length > 0) {
          const articles: NormalizedArticle[] = data.articles
            .filter((item: NewsApiArticle) => item.title && item.title !== "[Removed]")
            .map((item: NewsApiArticle, index: number) => ({
              id: `newsapi-${index}-${Date.parse(item.publishedAt ?? "") || Date.now()}`,
              title: item.title ?? "Berita Komunitas Gaming",
              description: item.description ?? "Klik untuk membaca selengkapnya laporan berita terkini seputar dunia teknologi dan gaming.",
              url: item.url ?? "https://newsapi.org",
              imageUrl: item.urlToImage ?? null,
              publishedAt: item.publishedAt ?? new Date().toISOString(),
              sourceName: item.source?.name ?? "Warta Gamer",
              category: "Gaming & Tech",
            }));

          if (articles.length > 0) {
            return NextResponse.json(
              { ok: true, provider: "newsapi", articles },
              {
                headers: {
                  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
                },
              }
            );
          }
        }
      }
    } catch (err) {
      console.warn("[NewsAPI] Failed to fetch, switching to APITube fallback:", err instanceof Error ? err.message : err);
    }
  }

  // 2. Coba Tarik dari APITube (Secondary Fallback Endpoint)
  if (apitubeKey) {
    try {
      const endpoint = "https://api.apitube.io/v1/news/everything?language.code=id&per_page=18";
      const response = await fetch(endpoint, {
        next: { revalidate: 3600 },
        headers: {
          "X-Api-Key": apitubeKey,
          "User-Agent": "LogHorizon-Community/1.0",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          const articles: NormalizedArticle[] = data.results
            .filter((item: ApiTubeArticle) => item.title && (item.href || item.title))
            .map((item: ApiTubeArticle, index: number) => {
              const sourceDomain =
                typeof item.source === "object" && item.source !== null
                  ? item.source.domain ?? "Media Nasional"
                  : typeof item.source === "string"
                    ? item.source
                    : "Warta Gamer";

              return {
                id: `apitube-${item.id ?? index}`,
                title: item.title ?? "Kabar Terkini Gaming & Teknologi",
                description: item.description ?? "Ikuti perkembangan informasi seputar industri game dan komputasi terkini.",
                url: item.href ?? "#",
                imageUrl: item.image ?? null,
                publishedAt: item.published_at ?? new Date().toISOString(),
                sourceName: sourceDomain,
                category: "Warta Teknologi",
              };
            });

          if (articles.length > 0) {
            return NextResponse.json(
              { ok: true, provider: "apitube", articles },
              {
                headers: {
                  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
                },
              }
            );
          }
        }
      }
    } catch (err) {
      console.warn("[APITube] Failed to fetch, switching to curated fallback:", err instanceof Error ? err.message : err);
    }
  }

  // 3. Fallback Terkurasi LogHorizon (High-Reliability Guarantees Zero Empty Screen)
  return NextResponse.json(
    { ok: true, provider: "curated-fallback", articles: CURATED_FALLBACK_ARTICLES },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
