import { PostCategory, Prisma } from "@prisma/client";
import { activeUser, authenticatedUser, jsonError } from "@/lib/http";
import { marketJson, type MarketData } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";
import { addXpInTransaction } from "@/lib/xp";
import { createNotification } from "@/lib/notifications";
import { sendDiscordNotice, notifyMarketplaceListing } from "@/lib/discord-webhook";
import { sanitizePlainText, sanitizeText } from "@/lib/sanitize";
import { checkContentSafety } from "@/lib/satpam-guardian";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

function isPostCategory(value: string | null): value is PostCategory {
  return value !== null && Object.values(PostCategory).includes(value as PostCategory);
}

function isValidUrl(value: unknown) {
  if (typeof value !== "string") return false;
  if (value.startsWith("data:image/")) return true;
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const categoryParam = url.searchParams.get("category");
    const category = categoryParam && isPostCategory(categoryParam) ? categoryParam : undefined;
    if (categoryParam && !category) return jsonError("Kategori tidak valid.", 400);
    const search = url.searchParams.get("search")?.trim();
    if (search && search.length > 120) return jsonError("Pencarian maksimal 120 karakter.", 400);
    const tag = url.searchParams.get("tag")?.trim().replace(/^#/, "");
    if (tag && tag.length > 50) return jsonError("Tag maksimal 50 karakter.", 400);
    const game = url.searchParams.get("game")?.trim();
    const type = url.searchParams.get("type");
    const sort = url.searchParams.get("sort");
    const filters: Prisma.PostWhereInput[] = [];
    if (category) filters.push({ category });
    if (tag) {
      filters.push({
        OR: [
          { content: { contains: `#${tag}`, mode: "insensitive" } },
          { title: { contains: `#${tag}`, mode: "insensitive" } },
          { title: { contains: tag, mode: "insensitive" } },
        ],
      });
    }
    if (search) {
      const searchFilters: Prisma.PostWhereInput[] = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { author: { is: { username: { contains: search, mode: "insensitive" } } } },
        { comments: { some: { content: { contains: search, mode: "insensitive" } } } },
      ];
      if (category === PostCategory.MARKETPLACE) {
        searchFilters.push({ marketData: { path: ["game"], string_contains: search } });
      }
      filters.push({ OR: searchFilters });
    }
    if (game) filters.push({ marketData: { path: ["game"], string_contains: game } });
    if (type === "WTS" || type === "WTB") filters.push({ marketData: { path: ["type"], equals: type } });
    const where: Prisma.PostWhereInput = filters.length ? { AND: filters } : {};
    const viewer = await authenticatedUser().catch(() => null);
    const priceOrder = sort === "asc" || sort === "desc";
    const rawLimit = Number(url.searchParams.get("limit") || 25);
    const take = Number.isSafeInteger(rawLimit) && rawLimit > 0 ? Math.min(50, rawLimit) : 25;
    const posts = await prisma.post.findMany({
      where,
      take,
      include: {
        author: { select: { id: true, username: true, avatar: true, role: true, isPremium: true, discordId: true } },
        votes: { where: { userId: viewer?.id ?? "" }, select: { value: true } },
        escrowTransactions: { where: { status: "IN_ESCROW" }, select: { id: true, buyerId: true, sellerId: true, status: true } },
      },
      orderBy: priceOrder
        ? [{ isPinned: "desc" }, { createdAt: "desc" }]
        : [{ isPinned: "desc" }, { author: { isPremium: "desc" } }, { createdAt: "desc" }],
    });

    const sellerIds = [...new Set(posts.map((p) => p.authorId))];
    const completedEscrows = await prisma.escrowTransaction.groupBy({
      by: ["sellerId"],
      where: { sellerId: { in: sellerIds }, status: "COMPLETED" },
      _count: { id: true },
    });
    const successMap = new Map(completedEscrows.map((item) => [item.sellerId, item._count.id]));

    const publicPosts = posts.map((post) => {
      const authorWithRep = {
        ...post.author,
        successfulSales: successMap.get(post.author.id) ?? 0,
      };

      if (post.category !== PostCategory.MARKETPLACE) return { ...post, author: authorWithRep, escrowTransactions: [] };
      const escrowTransactions = post.escrowTransactions
        .filter((transaction) => viewer && (viewer.id === transaction.sellerId || viewer.role === "ADMIN" || viewer.role === "MODERATOR"))
        .map(({ id, sellerId }) => ({ id, sellerId }));
      if (!post.marketData || typeof post.marketData !== "object" || Array.isArray(post.marketData)) {
        return { ...post, author: authorWithRep, escrowTransactions };
      }
      const publicMarketData = { ...post.marketData } as Record<string, Prisma.JsonValue>;
      delete publicMarketData.contact;
      return { ...post, author: authorWithRep, marketData: publicMarketData, escrowTransactions };
    });
    if (!priceOrder) return Response.json(publicPosts);
    const sorted = posts.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const priceA = typeof a.marketData === "object" && a.marketData && "price" in a.marketData ? Number(a.marketData.price) : 0;
      const priceB = typeof b.marketData === "object" && b.marketData && "price" in b.marketData ? Number(b.marketData.price) : 0;
      return sort === "asc" ? priceA - priceB : priceB - priceA;
    });
    return Response.json(sorted.map((post) => publicPosts.find((publicPost) => publicPost.id === post.id)!));
  } catch (error) {
    console.error("[api/posts] Failed to load posts:", error);
    return jsonError("Gagal memuat data postingan.", 500);
  }
}

export async function POST(request: Request) {
  const user = await activeUser();
  if (!user) return jsonError("Login Discord diperlukan untuk membuat postingan.", 401);

  const ip = getClientIp(request);
  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
  if (!isStaff) {
    const userLimit = checkRateLimit(`post:user:${user.id}`, 15, 60_000);
    if (!userLimit.allowed) {
      return jsonError(`Terlalu cepat membuat postingan (maksimal 15 postingan/menit). Harap tunggu ${userLimit.remainingSec} detik sebelum memposting kembali.`, 429);
    }
    const ipLimit = checkRateLimit(`post:ip:${ip}`, 20, 60_000);
    if (!ipLimit.allowed) {
      return jsonError(`Batas postingan per IP tercapai. Harap tunggu ${ipLimit.remainingSec} detik.`, 429);
    }
  }

  const payload: unknown = await request.json();
  if (!payload || typeof payload !== "object") return jsonError("Isi postingan tidak valid.", 400);
  const data = payload as Record<string, unknown>;
  const title = sanitizePlainText(typeof data.title === "string" ? data.title.trim() : "");
  const content = sanitizeText(typeof data.content === "string" ? data.content.trim() : "");
  const category = data.category;

  if (!title || title.length > 150) return jsonError("Judul wajib diisi (maksimal 150 karakter).", 400);
  const isPinned = data.isPinned === true;
  const isOwner = user.role === "ADMIN" || user.username === ".odyssia" || user.discordId === "706661230835925042";
  const hasPremiumPerks = user.isPremium || isOwner;
  if (isPinned && !hasPremiumPerks) return jsonError("Hanya member premium yang dapat menyematkan postingan.", 403);
  if (isPinned && !isOwner && await prisma.post.count({ where: { authorId: user.id, isPinned: true } }) >= 3) {
    return jsonError("Benefit Premium membatasi maksimal tiga postingan tersemat.", 403);
  }

  // Cek keamanan konten oleh Satpam AI (phishing, slot/judi online, toxic berat)
  const safety = await checkContentSafety(`${title} ${content}`, category === PostCategory.MARKETPLACE ? "MARKET" : "POST", user);
  if (!safety.isSafe) return jsonError(safety.reason ?? "Konten diblokir oleh Satpam AI.", 400);

  if (category === PostCategory.MARKETPLACE) {
    const market = data.marketData as Partial<MarketData> | undefined;
    if (
      !market ||
      (market.type !== "WTS" && market.type !== "WTB") ||
      typeof market.game !== "string" ||
      !market.game.trim() ||
      typeof market.price !== "number" ||
      !Number.isSafeInteger(market.price) ||
      market.price <= 0 ||
      market.price > 100_000_000 ||
      (market.imageUrl != null && (typeof market.imageUrl !== "string" || !isValidUrl(market.imageUrl))) ||
      !content ||
      content.length > 10_000
    ) return jsonError("Data lapak tidak valid. Harga harus berupa bilangan bulat antara Rp 1 - Rp 100.000.000 dan deskripsi maksimal 10.000 karakter.", 400);

    const contact = typeof market.contact === "string" && market.contact.trim()
      ? market.contact.trim()
      : user.discordId
        ? `https://discord.com/users/${user.discordId}`
        : `@${user.username ?? "member"}`;

    const marketData: MarketData = {
      type: market.type,
      game: market.game.trim(),
      price: market.price,
      contact,
      imageUrl: typeof market.imageUrl === "string" ? market.imageUrl : null,
      status: "AVAILABLE",
    };
    const post = await prisma.post.create({
      data: { authorId: user.id, category: PostCategory.MARKETPLACE, title, content, isPinned, marketData: marketJson(marketData) },
    });
    void notifyMarketplaceListing({
      postId: post.id,
      title,
      type: market.type,
      game: market.game.trim(),
      price: market.price,
      sellerName: user.username,
      imageUrl: typeof market.imageUrl === "string" ? market.imageUrl : null,
    });
    return Response.json(post, { status: 201 });
  }

  if (typeof category !== "string" || !isPostCategory(category) || category === PostCategory.MARKETPLACE) return jsonError("Kategori tidak valid.", 400);
  if (!content || content.length > 10_000) return jsonError("Isi thread wajib diisi (maksimal 10.000 karakter).", 400);
  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({ data: { authorId: user.id, category, title, content, isPinned } });
    await addXpInTransaction(tx, user.id, 10);
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  // Notifikasi real-time jika ada member yang di-mention (@username) di dalam thread
  const mentionMatches = [...new Set(content.match(/@([a-zA-Z0-9_.-]+)/g) || [])];
  const usernames = mentionMatches
    .map((m) => m.slice(1).toLowerCase())
    .filter((u) => u !== "satpam" && u !== user.username?.toLowerCase());
  if (usernames.length > 0) {
    void prisma.user.findMany({
      where: { username: { in: usernames, mode: "insensitive" }, id: { not: user.id } },
      select: { id: true, username: true },
    }).then((mentionedUsers) => {
      for (const mentioned of mentionedUsers) {
        void createNotification({
          userId: mentioned.id,
          type: "REPLY",
          message: `${user.username ?? "Seseorang"} menyebutmu (@${mentioned.username}) di thread: "${title.slice(0, 45)}"`,
          link: `/forum/${post.id}`,
        });
      }
    }).catch((err) => console.error("[mention-notification] Error:", err));
  }

  return Response.json(post, { status: 201 });
}
