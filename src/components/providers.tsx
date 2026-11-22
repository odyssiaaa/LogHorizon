"use client";

import { SessionProvider } from "next-auth/react";
import { LocaleProvider } from "@/context/locale-context";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SessionProvider>
      <LocaleProvider>{children}</LocaleProvider>
    </SessionProvider>
  );
}
