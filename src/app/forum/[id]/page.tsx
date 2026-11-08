import { ForumThread } from "@/components/forum-thread";

export const metadata = { title: "Diskusi — LogHorizon" };
export const instant = false;

export default async function ForumThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ForumThread id={id} />;
}
