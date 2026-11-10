import { NextResponse } from "next/server";

export type NormalizedArticle = {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  sourceName: string;
  category: "Game & Esports" | "Hardware & Tech" | "Konsol & Rilis" | "Turnamen & Guild";
};

// Fallback image pools by category
const CATEGORY_IMAGES: Record<string, string[]> = {
  "Game & Esports": [
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
  ],
  "Hardware & Tech": [
    "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1200&q=80",
  ],
  "Konsol & Rilis": [
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1612287232049-74d6f46ceef6?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=1200&q=80",
  ],
  "Turnamen & Guild": [
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
  ],
};

function assignCategory(title: string, desc: string): NormalizedArticle["category"] {
  const content = (title + " " + desc).toLowerCase();
  if (/turnamen|tournament|championship|esports|vct|mpl|juara|bracket/i.test(content)) {
    return "Turnamen & Guild";
  }
  if (/rtx|gpu|cpu|nvidia|amd|intel|processor|monitor|oled|ips|panel|vram|hardware|ai|komputasi/i.test(content)) {
    return "Hardware & Tech";
  }
  if (/playstation|ps5|xbox|nintendo|switch|konsol|console|rilis|remake|trailer/i.test(content)) {
    return "Konsol & Rilis";
  }
  return "Game & Esports";
}

function resolveImage(candidate: string | null | undefined, category: NormalizedArticle["category"], index: number): string {
  if (candidate && candidate.startsWith("http")) return candidate;
  const pool = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES["Game & Esports"];
  return pool[index % pool.length];
}

// 1. Curated Master Feed LogHorizon (Meliputi Divisi Game Komunitas)
const CURATED_ARTICLES: NormalizedArticle[] = [
  {
    id: "lh-master-1",
    title: "Valve Rilis Update Besar Counter-Strike 2: Peningkatan Sub-Tick & Integrasi VACNet 3.0",
    description: "Pembaruan mutakhir Valve menghadirkan optimalisasi responsivitas tembakan peluru, penyesuaian ekonomi bombsite, dan deteksi cheat otomatis yang jauh lebih ketat bagi skena kompetitif.",
    url: "https://store.steampowered.com/news/app/730",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    sourceName: "Valve Steam",
    category: "Game & Esports",
  },
  {
    id: "lh-master-2",
    title: "Riot Games Umumkan Roadmap VCT Pasifik: Penambahan Slot Masters dan Format Liga Baru",
    description: "Format liga franchise internasional diperbarui dengan babak kualifikasi Masters dan penambahan kuota perwakilan tim penantang (Challengers) menuju panggung dunia penutup musim.",
    url: "https://playvalorant.com/id-id/news",
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    sourceName: "Riot Esports",
    category: "Turnamen & Guild",
  },
  {
    id: "lh-master-3",
    title: "NVIDIA Umumkan Kartu Grafis RTX 50-Series: Arsitektur Blackwell untuk Gamer & AI Creator",
    description: "Lini GPU generasi terbaru menawarkan efisiensi daya komputasi tinggi, teknologi DLSS 4 berbasis neural rendering, dan akselerasi ray tracing generasi terbaru untuk resolusi 4K ultra.",
    url: "https://www.nvidia.com/id-id/geforce/news",
    imageUrl: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    sourceName: "GeForce Tech",
    category: "Hardware & Tech",
  },
  {
    id: "lh-master-4",
    title: "Moonton Rilis Patch Penyesuaian Hero Mobile Legends: Meta Jungler Tank Bergeser ke Assassin",
    description: "Penyesuaian atribut damage skill dan item penetrasi fisik memicu kebangkitan hero assassin lincah seperti Ling, Hayabusa, dan Fanny di ranked tier Mythical Immortal.",
    url: "https://m.mobilelegends.com/id/news",
    imageUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 9).toISOString(),
    sourceName: "Moonton MLBB",
    category: "Game & Esports",
  },
  {
    id: "lh-master-5",
    title: "Sony Interactive Entertainment Konfirmasi Peningkatan Performa Game di PlayStation 5 Pro",
    description: "Lebih dari 50 judul game populer mendapatkan label 'PS5 Pro Enhanced' dengan mode grafis 60 FPS stabil pada resolusi 4K dinamis menggunakan PlayStation Spectral Super Resolution (PSSR).",
    url: "https://blog.playstation.com",
    imageUrl: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 11).toISOString(),
    sourceName: "PlayStation Blog",
    category: "Konsol & Rilis",
  },
  {
    id: "lh-master-6",
    title: "Genshin Impact & HoYoverse Siapkan Wilayah Baru dengan Engine Grafis dan Karakter Anyar",
    description: "Para petualang Teyvat akan disuguhi alur cerita arsitektural yang lebih megah, mekanik eksplorasi vertikal baru, serta optimasi framerate stabil untuk perangkat PC dan mobile.",
    url: "https://genshin.hoyoverse.com/id/news",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    sourceName: "HoYoLAB",
    category: "Game & Esports",
  },
  {
    id: "lh-master-7",
    title: "Dota 2 Update Crownfall: Penambahan Act Baru, Arkana Eksklusif, dan Penyesuaian Map",
    description: "Valve meluncurkan kelanjutan cerita petualangan Crownfall dengan mini-game taktis, hadiah kosmetik langka, serta keseimbangan bounty rune di area jungle.",
    url: "https://www.dota2.com/news",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    sourceName: "Valve Dota 2",
    category: "Game & Esports",
  },
  {
    id: "lh-master-8",
    title: "Perbedaan Panel Layar Monitor Gaming: Kenali Karakteristik TN, IPS, VA, dan Keunggulan OLED",
    description: "Panduan lengkap memilih display monitor komputer untuk kompetitif FPS dengan refresh rate 360Hz hingga ketajaman kontras warna OLED bagi penikmat game sinematik AAA.",
    url: "https://gamebrott.com/perbedaan-panel-tn-va-ips-oled/",
    imageUrl: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 22).toISOString(),
    sourceName: "Warta Hardware",
    category: "Hardware & Tech",
  },
  {
    id: "lh-master-9",
    title: "Antusiasme Komunitas Sambut GTA VI: Analisis Detail Cuplikan Peta Vice City dan Engine RAGE",
    description: "Pengembangan game open world paling dinanti oleh Rockstar Games menunjukkan simulasi fisika air, kepadatan NPC realistis, dan integrasi grafis generasi konsol modern.",
    url: "https://www.rockstargames.com/newswire",
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 26).toISOString(),
    sourceName: "Rockstar Newswire",
    category: "Konsol & Rilis",
  },
  {
    id: "lh-master-10",
    title: "Turnamen Guild LogHorizon Season 1: Kualifikasi Divisi Valorant & MLBB Siap Digelar",
    description: "Pendaftaran turnamen resmi internal guild LogHorizon telah dibuka. Rebut hadiah kejayaan, titel kasta donatur kehormatan, dan XP komunitas dalam pertarungan tim taktis.",
    url: "/events",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    publishedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    sourceName: "LogHorizon Official",
    category: "Turnamen & Guild",
  },
];

// Parser RSS Feed sederhana tanpa dependensi eksternal
async function fetchRssArticles(url: string, sourceName: string): Promise<NormalizedArticle[]> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LogHorizon/1.0" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const text = await response.text();
    const itemBlocks = text.split("<item>").slice(1, 15);

    return itemBlocks
      .map((block, idx) => {
        const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || block.match(/<title>(.*?)<\/title>/i);
        const linkMatch = block.match(/<link>(.*?)<\/link>/i) || block.match(/<link\s+href=["'](.*?)["']/i);
        const descMatch = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i) || block.match(/<description>(.*?)<\/description>/i);
        const dateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/i);

        const title = titleMatch ? titleMatch[1].trim() : "";
        const link = linkMatch ? linkMatch[1].trim() : "";
        const rawDesc = descMatch ? descMatch[1] : "";
        const cleanDesc = rawDesc.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
        const publishedAt = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

        if (!title || !link) return null;

        const category = assignCategory(title, cleanDesc);
        const imageUrl = resolveImage(null, category, idx);

        return {
          id: `rss-${sourceName.toLowerCase()}-${idx}-${Date.parse(publishedAt) || idx}`,
          title,
          description: cleanDesc.slice(0, 240) + (cleanDesc.length > 240 ? "..." : ""),
          url: link,
          imageUrl,
          publishedAt,
          sourceName,
          category,
        };
      })
      .filter((item): item is NormalizedArticle => item !== null);
  } catch {
    return [];
  }
}

export async function GET() {
  const newsApiKey = process.env.NEWSAPI_KEY;
  const apitubeKey = process.env.APITUBE_KEY;

  const collectedArticles: NormalizedArticle[] = [];
  const titleSet = new Set<string>();

  function addArticle(article: NormalizedArticle) {
    const key = article.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
    if (!titleSet.has(key)) {
      titleSet.add(key);
      collectedArticles.push(article);
    }
  }

  // 1. Tarik dari Portal Gamebrott (RSS Gaming Indonesia Terlengkap)
  const gamebrottFeed = await fetchRssArticles("https://gamebrott.com/feed", "Gamebrott");
  gamebrottFeed.forEach(addArticle);

  // 2. Tarik dari Antara News Tekno (Warta Gadget & Teknologi Nasional)
  const antaraTeknoFeed = await fetchRssArticles("https://www.antaranews.com/rss/tekno.xml", "Antara Tekno");
  antaraTeknoFeed.forEach(addArticle);

  // 3. Tarik dari NewsAPI (jika key tersedia)
  if (newsApiKey) {
    try {
      const query = encodeURIComponent("gaming OR esports OR teknologi OR game OR valorant OR playstation OR steam");
      const res = await fetch(
        `https://newsapi.org/v2/everything?q=${query}&language=id&sortBy=publishedAt&pageSize=18&apiKey=${newsApiKey}`,
        { next: { revalidate: 3600 }, headers: { "User-Agent": "LogHorizon/1.0" } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === "ok" && Array.isArray(data.articles)) {
          data.articles.forEach((item: { title?: string; description?: string; url?: string; urlToImage?: string; publishedAt?: string; source?: { name?: string } }, idx: number) => {
            if (item.title && item.title !== "[Removed]") {
              const category = assignCategory(item.title, item.description ?? "");
              addArticle({
                id: `newsapi-${idx}-${Date.now()}`,
                title: item.title,
                description: item.description ?? "Warta berita gaming dan teknologi terkini untuk komunitas LogHorizon.",
                url: item.url ?? "#",
                imageUrl: resolveImage(item.urlToImage, category, idx),
                publishedAt: item.publishedAt ?? new Date().toISOString(),
                sourceName: item.source?.name ?? "Warta Gamer",
                category,
              });
            }
          });
        }
      }
    } catch {
      // lanjut ke sumber berikutnya jika limit
    }
  }

  // 4. Tarik dari APITube (jika key tersedia)
  if (apitubeKey) {
    try {
      const res = await fetch("https://api.apitube.io/v1/news/everything?language.code=id&per_page=15", {
        headers: { "X-Api-Key": apitubeKey },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results)) {
          data.results.forEach((item: { id?: string | number; title?: string; description?: string; href?: string; image?: string; published_at?: string; source?: { domain?: string } }, idx: number) => {
            if (item.title && item.href) {
              const category = assignCategory(item.title, item.description ?? "");
              addArticle({
                id: `apitube-${item.id ?? idx}`,
                title: item.title,
                description: item.description ?? "Perkembangan seputar industri komputasi dan game digital teranyar.",
                url: item.href,
                imageUrl: resolveImage(item.image, category, idx),
                publishedAt: item.published_at ?? new Date().toISOString(),
                sourceName: item.source?.domain ?? "APITube Dispatch",
                category,
              });
            }
          });
        }
      }
    } catch {
      // lanjut
    }
  }

  // 5. Masukkan Artikel Terkurasi LogHorizon
  CURATED_ARTICLES.forEach(addArticle);

  // Urutkan seluruh artikel dari yang paling mutakhir
  collectedArticles.sort((a, b) => {
    const timeA = Date.parse(a.publishedAt) || 0;
    const timeB = Date.parse(b.publishedAt) || 0;
    return timeB - timeA;
  });

  return NextResponse.json(
    {
      ok: true,
      totalCount: collectedArticles.length,
      provider: "LogHorizon Multi-Source Dispatch (NewsAPI, APITube, Gamebrott & Antara)",
      articles: collectedArticles,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
