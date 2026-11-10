import { PostCategory, Prisma } from "@prisma/client";
import { activeUser, authenticatedUser, jsonError } from "@/lib/http";
import { marketJson, type MarketData } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";
import { addXpInTransaction } from "@/lib/xp";
import { sendDiscordNotice } from "@/lib/discord-webhook";

function isPostCategory(value: string | null): value is PostCategory {
  return value !== null && Object.values(PostCategory).includes(value as PostCategory);
}

function isValidUrl(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const categoryParam = url.searchParams.get("category");
  const category = categoryParam && isPostCategory(categoryParam) ? categoryParam : undefined;
  if (categoryParam && !category) return jsonError("Kategori tidak valid.", 400);
  const search = url.searchParams.get("search")?.trim();
  if (search && search.length > 120) return jsonError("Pencarian maksimal 120 karakter.", 400);
  const game = url.searchParams.get("game")?.trim();
  const type = url.searchParams.get("type");
  const sort = url.searchParams.get("sort");
  const filters: Prisma.PostWhereInput[] = [];
  if (category) filters.push({ category });
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
  const viewer = await authenticatedUser();
  const priceOrder = sort === "asc" || sort === "desc";
  const posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, username: true, avatar: true, role: true, isPremium: true } },
      votes: { where: { userId: viewer?.id ?? "" }, select: { value: true } },
      escrowTransactions: { where: { status: "IN_ESCROW" }, select: { id: true, buyerId: true, sellerId: true, status: true } },
    },
    orderBy: priceOrder ? { createdAt: "desc" } : [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  const publicPosts = posts.map((post) => {
    if (post.category !== PostCategory.MARKETPLACE) return { ...post, escrowTransactions: [] };
    const escrowTransactions = post.escrowTransactions
      .filter((transaction) => viewer && (viewer.id === transaction.sellerId || viewer.role === "ADMIN" || viewer.role === "MODERATOR"))
      .map(({ id, sellerId }) => ({ id, sellerId }));
    if (!post.marketData || typeof post.marketData !== "object" || Array.isArray(post.marketData)) return { ...post, escrowTransactions };
    const publicMarketData = { ...post.marketData } as Record<string, Prisma.JsonValue>;
    delete publicMarketData.contact;
    return { ...post, marketData: publicMarketData, escrowTransactions };
  });
  if (!priceOrder) return Response.json(publicPosts);
  const sorted = posts.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const priceA = typeof a.marketData === "object" && a.marketData && "price" in a.marketData ? Number(a.marketData.price) : 0;
    const priceB = typeof b.marketData === "object" && b.marketData && "price" in b.marketData ? Number(b.marketData.price) : 0;
    return sort === "asc" ? priceA - priceB : priceB - priceA;
  });
  return Response.json(sorted.map((post) => publicPosts.find((publicPost) => publicPost.id === post.id)!));
}

export async function POST(request: Request) {
  const user = await activeUser();
  if (!user) return jsonError("Login Discord diperlukan untuk membuat postingan.", 401);

  const payload: unknown = await request.json();
  if (!payload || typeof payload !== "object") return jsonError("Isi postingan tidak valid.", 400);
  const data = payload as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const content = typeof data.content === "string" ? data.content.trim() : "";
  const category = data.category;

  if (!title || title.length > 180) return jsonError("Judul wajib diisi (maksimal 180 karakter).", 400);
  const isPinned = data.isPinned === true;
  if (isPinned && !user.isPremium) return jsonError("Hanya member premium yang dapat menyematkan postingan.", 403);
  if (isPinned && await prisma.post.count({ where: { authorId: user.id, isPinned: true } }) >= 3) {
    return jsonError("Benefit Premium membatasi maksimal tiga postingan tersemat.", 403);
  }
  if (category === PostCategory.MARKETPLACE) {
    const market = data.marketData as Partial<MarketData> | undefined;
    if (
      !market ||
      (market.type !== "WTS" && market.type !== "WTB") ||
      typeof market.game !== "string" ||
      !market.game.trim() ||
      typeof market.price !== "number" ||
      !Number.isInteger(market.price) ||
      market.price < 0 ||
      typeof market.contact !== "string" ||
      !market.contact.trim() ||
      (market.imageUrl != null && (typeof market.imageUrl !== "string" || !isValidUrl(market.imageUrl))) ||
      !content
    ) return jsonError("Data lapak tidak valid. Gambar bersifat opsional, tetapi URL yang diberikan harus valid.", 400);

    const marketData: MarketData = {
      type: market.type,
      game: market.game.trim(),
      price: market.price,
      contact: market.contact.trim(),
      imageUrl: typeof market.imageUrl === "string" ? market.imageUrl : null,
      status: "AVAILABLE",
    };
    const post = await prisma.post.create({
      data: { authorId: user.id, category: PostCategory.MARKETPLACE, title, content, isPinned, marketData: marketJson(marketData) },
    });
    void sendDiscordNotice("marketplace", `Lapak baru: ${title}`, `${market.type} · ${market.game} · Rp ${market.price.toLocaleString("id-ID")}`);
    return Response.json(post, { status: 201 });
  }

  if (typeof category !== "string" || !isPostCategory(category) || category === PostCategory.MARKETPLACE) return jsonError("Kategori tidak valid.", 400);
  if (!content || content.length > 10000) return jsonError("Isi thread wajib diisi (maksimal 10.000 karakter).", 400);
  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({ data: { authorId: user.id, category, title, content, isPinned } });
    await addXpInTransaction(tx, user.id, 10);
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return Response.json(post, { status: 201 });
}
