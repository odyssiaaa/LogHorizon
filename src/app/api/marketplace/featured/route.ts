import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PostCategory } from "@prisma/client";
import type { MarketplacePostRecord, TopSellerRecord } from "@/types/community";

export async function GET() {
  try {
    // 1. Dapatkan jumlah transaksi rekber sukses per seller
    const completedEscrows = await prisma.escrowTransaction.groupBy({
      by: ["sellerId"],
      where: { status: "COMPLETED" },
      _count: { id: true },
    });
    const successMap = new Map(completedEscrows.map((item) => [item.sellerId, item._count.id]));

    // 2. Kumpulkan seller kandidat: yang verified seller, atau punya transaksi rekber, atau owner .odyssia
    const topSellerIds = completedEscrows
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 15)
      .map((e) => e.sellerId);

    // Ambil juga pembuat lapak marketplace aktif
    const activeMarketAuthors = await prisma.post.findMany({
      where: { category: PostCategory.MARKETPLACE },
      distinct: ["authorId"],
      select: { authorId: true },
      take: 20,
    });
    const marketAuthorIds = activeMarketAuthors.map((m) => m.authorId);

    const candidateUsers = await prisma.user.findMany({
      where: {
        isBanned: false,
        OR: [
          { isVerifiedSeller: true },
          { username: ".odyssia" },
          { id: { in: topSellerIds } },
          { id: { in: marketAuthorIds } },
        ],
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        role: true,
        isPremium: true,
        isVerifiedSeller: true,
        equippedAvatarFrame: true,
        equippedCustomTitle: true,
        partyMembership: {
          select: {
            role: true,
            party: {
              select: {
                name: true,
                tag: true,
                emblemColor: true,
              },
            },
          },
        },
        posts: {
          where: { category: PostCategory.MARKETPLACE },
          select: { id: true, marketData: true },
        },
      },
      take: 25,
    });

    const sellers: TopSellerRecord[] = candidateUsers.map((u) => {
      const completedSalesCount = successMap.get(u.id) ?? 0;
      const activeListingsCount = u.posts.filter((p) => {
        if (!p.marketData || typeof p.marketData !== "object" || Array.isArray(p.marketData)) return true;
        const status = (p.marketData as Record<string, unknown>).status;
        return status !== "SOLD";
      }).length;

      return {
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        role: u.role,
        isPremium: u.isPremium,
        isVerifiedSeller: Boolean(u.isVerifiedSeller || u.username === ".odyssia"),
        equippedAvatarFrame: u.equippedAvatarFrame,
        equippedCustomTitle: u.equippedCustomTitle,
        partyMembership: u.partyMembership,
        completedSalesCount,
        activeListingsCount,
      };
    });

    // Urutan prioritas seller:
    // 1. isVerifiedSeller === true (Prioritas utama)
    // 2. completedSalesCount terbanyak
    // 3. activeListingsCount terbanyak
    sellers.sort((a, b) => {
      const verifiedA = a.isVerifiedSeller ? 1 : 0;
      const verifiedB = b.isVerifiedSeller ? 1 : 0;
      if (verifiedA !== verifiedB) return verifiedB - verifiedA;
      if (a.completedSalesCount !== b.completedSalesCount) {
        return b.completedSalesCount - a.completedSalesCount;
      }
      if (a.activeListingsCount !== b.activeListingsCount) {
        return b.activeListingsCount - a.activeListingsCount;
      }
      return (a.username ?? "").localeCompare(b.username ?? "");
    });

    // 3. Ambil listing rekomendasi pilihan guild (3-6 barang/akun aktif)
    const rawListings = await prisma.post.findMany({
      where: {
        category: PostCategory.MARKETPLACE,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
            isPremium: true,
            isVerifiedSeller: true,
            equippedAvatarFrame: true,
            equippedCustomTitle: true,
            partyMembership: {
              select: {
                role: true,
                party: {
                  select: {
                    name: true,
                    tag: true,
                    emblemColor: true,
                  },
                },
              },
            },
          },
        },
        votes: { select: { value: true } },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 20,
    });

    const availableRecommended = rawListings
      .filter((post) => {
        if (!post.marketData || typeof post.marketData !== "object" || Array.isArray(post.marketData)) return true;
        const status = (post.marketData as Record<string, unknown>).status;
        return !status || status === "AVAILABLE";
      })
      .map((post) => {
        const publicMarketData = { ...(post.marketData as Record<string, unknown>) };
        delete publicMarketData.contact;
        const salesCount = successMap.get(post.author.id) ?? 0;
        return {
          id: post.id,
          title: post.title,
          content: post.content,
          authorId: post.authorId,
          createdAt: post.createdAt.toISOString(),
          isPinned: post.isPinned,
          likes: post.likes,
          dislikes: post.dislikes,
          author: {
            ...post.author,
            isVerifiedSeller: Boolean(post.author.isVerifiedSeller || post.author.username === ".odyssia"),
            successfulSales: salesCount,
          },
          votes: post.votes as { value: "LIKE" | "DISLIKE" }[],
          marketData: publicMarketData as any,
          escrowTransactions: [],
        } as MarketplacePostRecord;
      });

    // Sort recommended:
    // 1. isPinned
    // 2. author.isVerifiedSeller
    // 3. author.successfulSales desc
    // 4. createdAt desc
    availableRecommended.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const verifiedA = a.author.isVerifiedSeller ? 1 : 0;
      const verifiedB = b.author.isVerifiedSeller ? 1 : 0;
      if (verifiedA !== verifiedB) return verifiedB - verifiedA;
      const salesA = a.author.successfulSales ?? 0;
      const salesB = b.author.successfulSales ?? 0;
      if (salesA !== salesB) return salesB - salesA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const recommendedListings = availableRecommended.slice(0, 6);

    return NextResponse.json({
      sellers: sellers.slice(0, 10),
      recommendedListings,
    });
  } catch (error) {
    console.error("[api/marketplace/featured] Error fetching featured sellers/listings:", error);
    return NextResponse.json({ sellers: [], recommendedListings: [] }, { status: 500 });
  }
}
