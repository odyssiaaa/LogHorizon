import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TournamentDetailView } from "@/components/tournament-detail-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      game: true,
      format: true,
      prizePool: true,
      maxSlots: true,
      status: true,
    },
  });

  if (!tournament) {
    return {
      title: "Turnamen Tidak Ditemukan | LogHorizon",
      description: "Turnamen komunitas LogHorizon tidak ditemukan atau telah dihapus.",
    };
  }

  const title = `🏆 ${tournament.title} - Turnamen Komunitas LogHorizon`;
  const description = `Ikuti turnamen resmi guild LogHorizon untuk ${tournament.game}! Format: ${tournament.format || `${tournament.maxSlots} Tim`}, Prizepool: ${tournament.prizePool || "Prizepool Resmi"}. Cek pohon bagan pertandingan dan daftarkan timmu sekarang!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/events/turnamen/${tournament.id}`,
      images: [
        {
          url: "/logo.png",
          width: 800,
          height: 600,
          alt: tournament.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/logo.png"],
    },
  };
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <TournamentDetailView tournamentId={id} />;
}
