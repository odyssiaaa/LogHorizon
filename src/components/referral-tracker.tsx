"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export function ReferralTracker() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const hasClaimedRef = useRef(false);

  useEffect(() => {
    // 1. Simpan ref dari query parameter URL jika ada
    const refParam = searchParams?.get("ref");
    if (refParam && typeof window !== "undefined") {
      try {
        localStorage.setItem("loghorizon_ref_code", refParam.trim());
        // Simpan juga di cookie 30 hari untuk fallback server
        document.cookie = `loghorizon_ref=${encodeURIComponent(refParam.trim())}; path=/; max-age=2592000; SameSite=Lax`;
      } catch {
        // Ignored
      }
    }
  }, [searchParams]);

  useEffect(() => {
    // 2. Jika user sudah login dan terdapat pending referral code di localStorage/cookie
    if (status !== "authenticated" || !session?.user?.id || hasClaimedRef.current) return;

    try {
      const storedRef = localStorage.getItem("loghorizon_ref_code");
      if (!storedRef) return;

      hasClaimedRef.current = true;
      fetch("/api/user/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: storedRef }),
      })
        .then((res) => {
          if (res.ok) {
            localStorage.removeItem("loghorizon_ref_code");
          }
        })
        .catch(() => {});
    } catch {
      // Ignored
    }
  }, [session, status]);

  return null;
}
