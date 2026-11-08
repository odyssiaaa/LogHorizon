import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function validateAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000) {
    throw new RangeError("XP amount must be an integer between 1 and 1,000,000.");
  }
}

export async function addXpInTransaction(tx: Prisma.TransactionClient, userId: string, amount: number, badge?: string) {
  validateAmount(amount);
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true, badges: true },
  });
  if (!user) return null;

  let newLevel = user.level;
  let remainingXp = user.xp + amount;
  while (remainingXp >= newLevel * 100) {
    remainingXp -= newLevel * 100;
    newLevel += 1;
  }

  const badges = new Set(user.badges);
  if (newLevel >= 10) badges.add("Veteran");
  if (badge) badges.add(badge);

  return tx.user.update({
    where: { id: userId },
    data: { xp: remainingXp, level: newLevel, badges: [...badges] },
  });
}

export async function addXpToUser(userId: string, amount: number, badge?: string) {
  validateAmount(amount);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        (tx) => addXpInTransaction(tx, userId, amount, badge),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const isSerializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!isSerializationConflict || attempt === 2) throw error;
    }
  }

  throw new Error("Unable to add XP after retrying serialization conflicts.");
}
