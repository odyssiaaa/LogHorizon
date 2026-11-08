import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const session = await auth();
  const user = session?.user;
  const allowed =
    user &&
    !user.isBanned &&
    (user.role === "ADMIN" || user.role === "MODERATOR");

  if (!allowed) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
