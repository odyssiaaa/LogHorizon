import type { Prisma } from "@prisma/client";

export type MarketData = {
  type: "WTS" | "WTB";
  game: string;
  price: number;
  contact: string;
  status: "AVAILABLE" | "IN_ESCROW" | "SOLD";
  imageUrl?: string | null;
};

export type PublicMarketData = Omit<MarketData, "contact">;

export function isMarketData(value: unknown): value is MarketData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    (data.type === "WTS" || data.type === "WTB") &&
    typeof data.game === "string" &&
    typeof data.price === "number" &&
    Number.isInteger(data.price) &&
    data.price >= 0 &&
    typeof data.contact === "string" &&
    (data.status === "AVAILABLE" || data.status === "IN_ESCROW" || data.status === "SOLD") &&
    (data.imageUrl == null || typeof data.imageUrl === "string")
  );
}

export function isPublicMarketData(value: unknown): value is PublicMarketData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    (data.type === "WTS" || data.type === "WTB") &&
    typeof data.game === "string" &&
    typeof data.price === "number" &&
    Number.isInteger(data.price) &&
    typeof data.status === "string" &&
    (data.status === "AVAILABLE" || data.status === "IN_ESCROW" || data.status === "SOLD") &&
    (data.imageUrl == null || typeof data.imageUrl === "string")
  );
}

export function marketJson(data: MarketData): Prisma.InputJsonObject {
  return { ...data };
}
