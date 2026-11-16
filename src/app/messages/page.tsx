import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { MessagesView } from "@/components/messages-view";
import Link from "next/link";
import { MessageSquare, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Pesan & Obrolan Komunitas | LogHorizon",
  description: "Obrolan pribadi dan grup komunitas guild LogHorizon.",
};

export const instant = false;

export default async function MessagesPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="py-16 px-4 text-center max-w-md mx-auto w-full">
        <div className="p-8 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-xl space-y-4">
          <div className="w-14 h-14 mx-auto rounded-none bg-purple-500/10 border border-purple-500/20 text-[#9D4EDD] flex items-center justify-center">
            <MessageSquare size={28} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Pesan &amp; Obrolan Komunitas
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kamu harus login terlebih dahulu untuk mengakses pesan pribadi dan grup chat guild.
          </p>
          <Link
            href="/api/auth/signin"
            className="button button-primary w-full justify-center text-xs font-bold py-2.5 inline-flex items-center gap-2"
          >
            Masuk dengan Discord
          </Link>
        </div>
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-xs text-gray-400">
          Memuat pesan komunitas...
        </div>
      }
    >
      <MessagesView />
    </Suspense>
  );
}
