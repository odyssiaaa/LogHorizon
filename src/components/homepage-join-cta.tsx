"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { openLoginModal } from "@/components/login-modal";
import { ArrowUpRight, LogIn, UserCheck } from "lucide-react";

export function HomepageJoinCta() {
  const { data: session } = useSession();

  if (session?.user) {
    return (
      <Link
        href="/profile"
        className="px-6 py-3.5 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-sans font-bold text-sm inline-flex items-center justify-center gap-2 border border-[#7C3AED] transition-colors whitespace-nowrap self-stretch sm:self-auto shadow-sm"
      >
        <UserCheck size={17} />
        <span>Buka Profil Petualang</span>
        <ArrowUpRight size={17} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openLoginModal("/profile")}
      className="px-6 py-3.5 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-sans font-bold text-sm inline-flex items-center justify-center gap-2 border border-[#7C3AED] transition-colors whitespace-nowrap self-stretch sm:self-auto shadow-sm cursor-pointer"
    >
      <LogIn size={17} />
      <span>Masuk / Daftar Sekarang (Discord & Google)</span>
      <ArrowUpRight size={17} />
    </button>
  );
}
