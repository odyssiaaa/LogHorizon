import { Inbox, SearchCode } from "lucide-react";

export function SkeletonForumCard() {
  return (
    <div className="forum-post animate-pulse p-4 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] flex flex-col sm:flex-row gap-3">
      <div className="w-14 h-10 rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
      <div className="flex-1 space-y-2.5">
        <div className="h-5 w-3/4 rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
        <div className="h-3.5 w-full rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
        <div className="flex gap-4 pt-1">
          <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
          <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonMarketCard() {
  return (
    <div className="market-card animate-pulse rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] overflow-hidden">
      <div className="h-44 w-full bg-neutral-200 dark:bg-[#1E1A3A]" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-4 w-2/3 rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
        <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
        <div className="h-5 w-1/2 rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
        <div className="h-3 w-full rounded bg-neutral-200 dark:bg-[#1E1A3A]" />
      </div>
    </div>
  );
}

export function TacticalEmptyState({
  title,
  description,
  isSearch = false,
}: {
  title?: string;
  description?: string;
  isSearch?: boolean;
}) {
  const Icon = isSearch ? SearchCode : Inbox;
  return (
    <div className="my-8 flex flex-col items-center justify-center rounded-md border border-dashed border-gray-300 dark:border-[#211C2B] p-10 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-neutral-100 dark:bg-[#1A1526] text-gray-400 dark:text-purple-400/50 mb-3">
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
        {title ?? (isSearch ? "Pencarian Tidak Ditemukan" : "Belum Ada Data")}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
        {description ?? (isSearch ? "Tidak ada petualang atau item di arena ini. Coba periksa kembali kata kunci pencarianmu." : "Arena saat ini sedang hening. Jadilah pelopor pertama untuk memulai!")}
      </p>
    </div>
  );
}
