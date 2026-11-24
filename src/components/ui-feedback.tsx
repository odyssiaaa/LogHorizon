import { Inbox, SearchCode } from "lucide-react";
import { EmptyStateCard, EmptyStateAction } from "@/components/empty-state-card";

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
  actionPrimary,
  actionSecondary,
}: {
  title?: string;
  description?: string;
  isSearch?: boolean;
  actionPrimary?: EmptyStateAction;
  actionSecondary?: EmptyStateAction;
}) {
  const Icon = isSearch ? SearchCode : Inbox;
  return (
    <EmptyStateCard
      icon={Icon}
      title={title ?? (isSearch ? "Pencarian Tidak Ditemukan" : "Belum Ada Data")}
      description={
        description ??
        (isSearch
          ? "Tidak ada petualang atau item di arena ini. Coba periksa kembali kata kunci pencarianmu atau reset filter."
          : "Arena saat ini sedang hening. Jadilah pelopor pertama untuk memulai aktivitas di sini!")
      }
      actionPrimary={actionPrimary}
      actionSecondary={actionSecondary}
    />
  );
}
