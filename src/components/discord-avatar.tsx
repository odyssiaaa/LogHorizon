import Image from "next/image";

export function DiscordAvatar({ src, username, size = 40, className = "" }: { src: string | null; username: string | null; size?: 40 | 48; className?: string }) {
  const label = username ?? "Gamer";
  return src
    ? <Image className={className} src={src} alt={`${label} avatar`} width={size} height={size} unoptimized />
    : <span className={`${className} avatar-fallback`} role="img" aria-label={`${label} avatar`}>{label.slice(0, 1).toUpperCase()}</span>;
}
