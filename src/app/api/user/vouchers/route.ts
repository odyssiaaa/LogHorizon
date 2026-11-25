import { NextResponse } from "next/server";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const instant = false;

export async function GET(req: Request) {
  const user = await activeUser();
  if (!user) {
    return jsonError("Login diperlukan untuk melihat dompet voucher.", 401);
  }

  try {
    const claims = await prisma.redeemClaim.findMany({
      where: {
        userId: user.id,
        redeemCode: {
          category: "SPONSOR_VOUCHER",
        },
      },
      include: {
        redeemCode: {
          select: {
            id: true,
            code: true,
            category: true,
            sponsorName: true,
            title: true,
            rewardType: true,
            rewardValue: true,
            sponsorActionUrl: true,
            expiresAt: true,
          },
        },
      },
      orderBy: { claimedAt: "desc" },
    });

    const vouchers = claims.map((c) => ({
      claimId: c.id,
      codeId: c.redeemCode.id,
      promoCode: c.redeemCode.code,
      uniqueClaimSerial: c.uniqueClaimSerial,
      source: c.source,
      claimedAt: c.claimedAt,
      title: c.redeemCode.title,
      sponsorName: c.redeemCode.sponsorName || "OdyssiaVault",
      discountValue: c.redeemCode.rewardValue,
      sponsorActionUrl:
        c.redeemCode.sponsorActionUrl && !c.redeemCode.sponsorActionUrl.includes("odyssiavault.com")
          ? c.redeemCode.sponsorActionUrl
          : "http://odyssiavault.kiospremium.site/",
      expiresAt: c.redeemCode.expiresAt,
    }));

    return NextResponse.json({ vouchers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memuat dompet voucher." }, { status: 500 });
  }
}
