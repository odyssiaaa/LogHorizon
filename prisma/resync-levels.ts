import { PrismaClient } from "@prisma/client";
import { getLevelProgressFromXp } from "../src/lib/level-system";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Memulai resync otomatis Level ↔ XP seluruh member LogHorizon...");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      level: true,
      xp: true,
    },
    orderBy: { xp: "desc" },
  });

  console.log(`📊 Ditemukan ${users.length} akun petualang di tabel User.`);

  let updatedCount = 0;
  let alreadySyncedCount = 0;

  for (const user of users) {
    const totalXp = Math.max(0, user.xp || 0);
    const progress = getLevelProgressFromXp(totalXp);
    const correctLevel = progress.level;

    if (user.level !== correctLevel) {
      await prisma.user.update({
        where: { id: user.id },
        data: { level: correctLevel },
      });

      console.log(
        `✅ Disinkronkan: @${user.username || user.name || user.id} | XP: ${totalXp.toLocaleString("id-ID")} | Level Lama: ${user.level} ➔ Level Baru: ${correctLevel} (Progres: ${progress.currentLevelXp}/${progress.xpForNextLevel} XP, ${progress.progressPercent}%)`
      );
      updatedCount++;
    } else {
      alreadySyncedCount++;
    }
  }

  console.log("==================================================");
  console.log(`🎉 Resync Selesai!`);
  console.log(`- Total Akun Diperbarui : ${updatedCount}`);
  console.log(`- Total Akun Sudah Pas  : ${alreadySyncedCount}`);
  console.log(`- Total Seluruh Akun    : ${users.length}`);
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("❌ Terjadi kesalahan saat resync:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
