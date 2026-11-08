import { timingSafeEqual } from "node:crypto";
import { Role } from "@prisma/client";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { addXpInTransaction } from "@/lib/xp";

function isAuthorized(request: Request) {
  const expected = process.env.DISCORD_SYNC_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || expected.length < 32 || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return jsonError("Unauthorized.", 401);
  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const discordId = typeof data.discordId === "string" ? data.discordId.trim() : "";
  const xpDelta = data.xpDelta === undefined ? 0 : data.xpDelta;
  const role = data.role;
  if (!/^\d{17,20}$/.test(discordId) || typeof xpDelta !== "number" || !Number.isSafeInteger(xpDelta) || xpDelta < 0 || xpDelta > 1000) {
    return jsonError("discordId atau xpDelta tidak valid.", 400);
  }
  if (role !== undefined && (typeof role !== "string" || !Object.values(Role).includes(role as Role))) {
    return jsonError("Role tidak valid.", 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { discordId }, select: { id: true } });
    if (!user) return null;
    if (role !== undefined) await tx.user.update({ where: { id: user.id }, data: { role: role as Role } });
    if (xpDelta > 0) await addXpInTransaction(tx, user.id, xpDelta);
    return tx.user.findUnique({
      where: { id: user.id },
      select: { discordId: true, username: true, role: true, xp: true, level: true, badges: true },
    });
  }, { isolationLevel: "Serializable" });
  if (!updated) return jsonError("User Discord belum terhubung ke akun LogHorizon.", 404);
  return Response.json(updated);
}
