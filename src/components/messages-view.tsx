"use client";

import { useEffect, useRef, useState, FormEvent, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Crown,
  LogOut,
  MessageSquare,
  MoreVertical,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Shield,
  Smile,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { DiscordAvatar } from "@/components/discord-avatar";
import { readApiResponse } from "@/lib/api-response";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useLiveSync } from "@/hooks/use-live-sync";
import { EmptyStateCard } from "@/components/empty-state-card";

type UserSummary = {
  id: string;
  name?: string | null;
  username: string | null;
  avatar?: string | null;
  isPremium?: boolean;
  role: string;
};

type Participant = {
  id: string;
  userId: string;
  joinedAt: string;
  user: UserSummary;
};

type MessageItem = {
  id: string;
  conversationId?: string;
  senderId: string;
  content: string;
  imageUrl?: string | null;
  isDeleted?: boolean;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string;
    imageUrl?: string | null;
    isDeleted?: boolean;
    sender: {
      id: string;
      name?: string | null;
      username?: string | null;
    };
  } | null;
  reactions?: Record<string, string[]> | null;
  createdAt: string;
  sender?: UserSummary;
};

type ConversationSummary = {
  id: string;
  name?: string | null;
  isGroup: boolean;
  creatorId?: string | null;
  createdAt: string;
  updatedAt: string;
  participants: Participant[];
  lastMessage?: MessageItem | null;
  unreadCount: number;
};

type ConversationDetail = {
  id: string;
  name?: string | null;
  isGroup: boolean;
  creatorId?: string | null;
  createdAt: string;
  updatedAt: string;
  participants: Participant[];
  messages: MessageItem[];
  creator?: UserSummary | null;
};

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "🔥"];

function FormattedChatMessage({ text, isDeleted }: { text: string; isDeleted?: boolean }) {
  if (isDeleted) {
    return <span className="italic text-gray-400 text-xs sm:text-sm">🚫 Pesan ini telah dihapus</span>;
  }

  const imageRegex = /!\[(.*?)\]\(((?:data:image\/[^)]+|https?:\/\/[^)]+|\/[^)]+))\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imageRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={lastIndex} className="whitespace-pre-wrap">
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }
    const alt = match[1] || "Gambar";
    const src = match[2];
    parts.push(
      <span key={match.index} className="block my-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="max-h-60 max-w-full rounded-lg border border-white/20 bg-black/40 object-contain shadow-md"
        />
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={lastIndex} className="whitespace-pre-wrap">
        {text.slice(lastIndex)}
      </span>
    );
  }

  return <>{parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{text}</span>}</>;
}

export function MessagesView() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const targetUserParam = searchParams?.get("to") || searchParams?.get("user") || searchParams?.get("userId") || null;
  const conversationIdParam = searchParams?.get("conversationId") || searchParams?.get("id") || null;
  const partyParam = searchParams?.get("party") || searchParams?.get("partyId") || null;

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [chatAttachment, setChatAttachment] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [error, setError] = useState("");

  // WhatsApp-style reply
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);

  // 3-dots Conversation Menu
  const [showConvMenu, setShowConvMenu] = useState(false);

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [groupSelectedUsers, setGroupSelectedUsers] = useState<UserSummary[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<UserSummary[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);

  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [addMembersSelected, setAddMembersSelected] = useState<UserSummary[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageTimestampRef = useRef<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const me = session?.user;

  // Auto scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // Close 3-dots menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowConvMenu(false);
      }
    }
    if (showConvMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showConvMenu]);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await readApiResponse<{ conversations: ConversationSummary[] }>(
        res,
        "Gagal memuat daftar obrolan."
      );
      const freshList = data.conversations || [];
      setConversations((prev) => (JSON.stringify(prev) === JSON.stringify(freshList) ? prev : freshList));
    } catch (err) {
      console.error("Gagal memuat obrolan:", err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  // Handle targetUser query param (auto open or create 1-on-1 PM)
  useEffect(() => {
    if (!targetUserParam || !me?.id) return;

    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isGroup: false, targetUserId: targetUserParam }),
        });
        const data = await readApiResponse<{ conversation: ConversationDetail }>(
          res,
          "Gagal memulai obrolan dengan pengguna ini."
        );
        if (!active) return;
        if (data.conversation?.id) {
          setActiveConvId(data.conversation.id);
          void fetchConversations();
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Gagal memulai obrolan.");
      }
    })();

    return () => {
      active = false;
    };
  }, [targetUserParam, me?.id, fetchConversations]);

  // Handle direct conversationId or party query param
  useEffect(() => {
    if (conversationIdParam) {
      setActiveConvId(conversationIdParam);
    } else if (partyParam) {
      void (async () => {
        try {
          const res = await fetch(`/api/parties/${partyParam}/chat`);
          if (res.ok) {
            const data = await res.json();
            if (data.conversationId) {
              setActiveConvId(data.conversationId);
            }
          }
        } catch {
          // ignore error
        }
      })();
    }
  }, [conversationIdParam, partyParam]);

  // Fetch full active conversation detail
  const loadConversationDetail = useCallback(async (convId: string) => {
    setLoadingChat(true);
    setError("");
    setReplyingTo(null);
    setShowConvMenu(false);
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      const data = await readApiResponse<{ conversation: ConversationDetail }>(
        res,
        "Gagal memuat detail percakapan."
      );
      setActiveDetail(data.conversation);
      setMessages(data.conversation.messages || []);

      if (data.conversation.messages && data.conversation.messages.length > 0) {
        const last = data.conversation.messages[data.conversation.messages.length - 1];
        lastMessageTimestampRef.current = last.createdAt;
      } else {
        lastMessageTimestampRef.current = null;
      }

      // Mark unread as 0 locally
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );

      setTimeout(() => scrollToBottom(false), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat detail obrolan.");
    } finally {
      setLoadingChat(false);
    }
  }, [scrollToBottom]);

  // When activeConvId changes, load conversation
  useEffect(() => {
    if (activeConvId) {
      void loadConversationDetail(activeConvId);
    } else {
      setActiveDetail(null);
      setMessages([]);
      setReplyingTo(null);
      lastMessageTimestampRef.current = null;
    }
  }, [activeConvId, loadConversationDetail]);

  // Polling via useLiveSync
  useLiveSync(
    async () => {
      if (!activeConvId) return;

      const after = lastMessageTimestampRef.current;
      const url = after
        ? `/api/conversations/${activeConvId}/messages?after=${encodeURIComponent(after)}`
        : `/api/conversations/${activeConvId}/messages`;

      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as { success: boolean; messages?: MessageItem[] };
        if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOnes = data.messages!.filter((m) => !existingIds.has(m.id));
            if (newOnes.length === 0) return prev;
            return [...prev, ...newOnes];
          });

          const latest = data.messages[data.messages.length - 1];
          lastMessageTimestampRef.current = latest.createdAt;
          scrollToBottom(true);
        }
      } catch {
        // Silently catch background polling errors
      }
    },
    { intervalMs: 3500, enabled: Boolean(activeConvId), revalidateOnFocus: true }
  );

  // Send message with replyToId
  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    const text = messageInput.trim();
    if ((!text && !chatAttachment) || !activeConvId || sending) return;

    setSending(true);
    let content = text;
    if (chatAttachment) {
      content = content ? `${content}\n\n![Gambar](${chatAttachment})` : `![Gambar](${chatAttachment})`;
    }

    const payload: { content: string; replyToId?: string } = { content };
    if (replyingTo) {
      payload.replyToId = replyingTo.id;
    }

    setMessageInput("");
    setChatAttachment(null);
    const targetReply = replyingTo;
    setReplyingTo(null);

    try {
      const res = await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readApiResponse<{ message: MessageItem }>(res, "Gagal mengirim pesan.");
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        lastMessageTimestampRef.current = data.message.createdAt;
        scrollToBottom(true);

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId
              ? { ...c, lastMessage: data.message, updatedAt: data.message.createdAt }
              : c
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim pesan.");
      if (targetReply) setReplyingTo(targetReply);
    } finally {
      setSending(false);
    }
  }

  // Delete single message
  async function handleDeleteMessage(messageId: string) {
    if (!confirm("Hapus pesan ini untuk semua orang?")) return;
    try {
      const res = await fetch(`/api/messages/message/${messageId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus pesan.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isDeleted: true, content: "🚫 Pesan ini telah dihapus" } : m
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus pesan.");
    }
  }

  // Toggle quick emoji reaction
  async function handleReaction(messageId: string, emoji: string) {
    try {
      const res = await fetch("/api/messages/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      const data = await res.json();
      if (data.reactions) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m))
        );
      }
    } catch (err) {
      console.error("Gagal mengirim reaksi:", err);
    }
  }

  // Clear all messages in conversation
  async function handleClearChat() {
    if (!activeConvId) return;
    if (!confirm("Bersihkan seluruh isi chat dalam percakapan ini? Pesan yang dihapus tidak dapat dipulihkan.")) return;
    try {
      const res = await fetch(`/api/messages/conversation/${activeConvId}?action=clear`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal membersihkan isi chat.");
      setMessages([]);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvId ? { ...c, lastMessage: null } : c))
      );
      setShowConvMenu(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membersihkan chat.");
    }
  }

  // Delete entire conversation
  async function handleDeleteConversation() {
    if (!activeConvId) return;
    if (!confirm("Hapus percakapan ini beserta seluruh riwayat pesannya secara permanen?")) return;
    try {
      const res = await fetch(`/api/messages/conversation/${activeConvId}?action=delete`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus percakapan.");
      setActiveConvId(null);
      setShowConvMenu(false);
      void fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus percakapan.");
    }
  }

  // Search users for group creation & adding
  useEffect(() => {
    if (!memberSearchQuery.trim() || memberSearchQuery.length < 2) {
      setMemberSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingMembers(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(memberSearchQuery.trim())}`);
        const data = (await res.json()) as { success: boolean; users?: UserSummary[] };
        if (data.success && Array.isArray(data.users)) {
          setMemberSearchResults(data.users);
        }
      } catch (err) {
        console.error("Gagal mencari user:", err);
      } finally {
        setSearchingMembers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [memberSearchQuery]);

  // Create Group Chat
  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault();
    const name = groupNameInput.trim();
    if (!name) return;

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isGroup: true,
          name,
          memberIds: groupSelectedUsers.map((u) => u.id),
        }),
      });

      const data = await readApiResponse<{ conversation: ConversationDetail }>(
        res,
        "Gagal membuat grup obrolan."
      );
      if (data.conversation) {
        setShowCreateGroup(false);
        setGroupNameInput("");
        setGroupSelectedUsers([]);
        setMemberSearchQuery("");
        setActiveConvId(data.conversation.id);
        void fetchConversations();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat grup.");
    }
  }

  // Add Members to Group
  async function handleAddMembers(e: FormEvent) {
    e.preventDefault();
    if (!activeConvId || addMembersSelected.length === 0) return;

    try {
      const res = await fetch(`/api/conversations/${activeConvId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: addMembersSelected.map((u) => u.id),
        }),
      });
      const data = await readApiResponse<{ participants: Participant[] }>(
        res,
        "Gagal menambahkan anggota ke grup."
      );
      if (data.participants && activeDetail) {
        setActiveDetail({ ...activeDetail, participants: data.participants });
        setShowAddMembersModal(false);
        setAddMembersSelected([]);
        setMemberSearchQuery("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah anggota.");
    }
  }

  // Leave Group
  async function handleLeaveGroup() {
    if (!activeConvId) return;
    if (!confirm("Keluar dari grup obrolan ini?")) return;

    try {
      await fetch(`/api/conversations/${activeConvId}`, { method: "DELETE" });
      setActiveConvId(null);
      void fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal keluar dari obrolan.");
    }
  }

  // Helper to get conversation label & avatar
  function getConvDisplay(conv: ConversationSummary | ConversationDetail) {
    if (conv.isGroup) {
      return {
        title: conv.name || "Grup Komunitas",
        subtitle: `${conv.participants?.length || 0} anggota`,
        isGroup: true,
        user: null,
      };
    }
    const other = conv.participants?.find((p) => p.userId !== me?.id)?.user;
    return {
      title: other?.username || other?.name || "Petualang",
      subtitle: other?.role === "ADMIN" ? "Prince/Princess (Admin)" : "Guild Member",
      isGroup: false,
      user: other || null,
    };
  }

  const filteredConversations = conversations.filter((c) => {
    if (!searchFilter.trim()) return true;
    const disp = getConvDisplay(c);
    return disp.title.toLowerCase().includes(searchFilter.toLowerCase().trim());
  });

  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0 overflow-x-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <span className="text-[11px] font-mono text-[#9D4EDD] uppercase tracking-widest font-bold block">
            Direct Messaging &amp; Party Lounge
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <MessageSquare size={24} className="text-[#9D4EDD]" />
            <span>Pesan &amp; Obrolan Komunitas</span>
          </h1>
        </div>

        <button
          onClick={() => {
            setShowCreateGroup(true);
            setGroupNameInput("");
            setGroupSelectedUsers([]);
            setMemberSearchQuery("");
          }}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-md shadow-[#7C3AED]/20"
        >
          <Plus size={16} />
          <span>Buat Grup Chat</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Dual-Column Panel (Mobile Master-Detail) */}
      <div className="h-[80vh] min-h-[580px] rounded-2xl border border-[#2A1B42] bg-[#120B1E]/90 shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* LEFT COLUMN: CONVERSATION LIST (Hidden on mobile when chat is open) */}
        <aside
          className={`w-full md:w-80 lg:w-96 border-r border-[#2A1B42] flex flex-col bg-[#0A0612]/70 ${
            activeConvId ? "hidden md:flex" : "flex flex-1 md:flex-none"
          }`}
        >
          {/* Search Box */}
          <div className="p-3.5 border-b border-[#2A1B42]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari obrolan / teman..."
                className="w-full h-10 pl-9 pr-8 rounded-lg border border-[#2A1B42] bg-[#161024] text-xs text-white placeholder:text-gray-500 focus:border-[#7C3AED] focus:outline-none"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Conversations Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#2A1B42]/50 no-scrollbar">
            {loadingList ? (
              <div className="p-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-[#9D4EDD]" />
                <span>Memuat pesan...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4">
                <EmptyStateCard
                  icon={MessageSquare}
                  title="Belum Ada Obrolan"
                  description="Mulai PM dari profil petualang, lapak marketplace, atau buat grup baru untuk koordinasi misi guild."
                  actionPrimary={{
                    label: "+ Buat Grup Baru",
                    onClick: () => setShowCreateGroup(true),
                  }}
                  actionSecondary={
                    searchFilter
                      ? {
                          label: "🔄 Reset Filter",
                          onClick: () => setSearchFilter(""),
                        }
                      : undefined
                  }
                />
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const disp = getConvDisplay(conv);
                const isActive = conv.id === activeConvId;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors ${
                      isActive
                        ? "bg-[#7C3AED]/20 border-l-4 border-[#7C3AED]"
                        : "hover:bg-purple-950/20"
                    }`}
                  >
                    {disp.isGroup ? (
                      <div className="w-10 h-10 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                        <Users size={18} />
                      </div>
                    ) : (
                      <DiscordAvatar
                        src={disp.user?.avatar ?? null}
                        username={disp.user?.username ?? null}
                        size={40}
                        className="size-10 rounded-full border border-purple-500/30 shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-white truncate">
                          {disp.title}
                        </span>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                            {new Date(conv.lastMessage.createdAt).toLocaleDateString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-gray-400 truncate">
                          {conv.lastMessage?.isDeleted
                            ? "🚫 Pesan ini telah dihapus"
                            : conv.lastMessage?.content || "Belum ada pesan"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7C3AED] text-white shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: ACTIVE CHAT PANE */}
        <section
          className={`flex-1 flex flex-col bg-[#120B1E]/95 ${
            !activeConvId ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConvId && activeDetail ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-[#2A1B42] flex items-center justify-between gap-3 bg-[#161024]">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button (Returns to conversation list) */}
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 shrink-0"
                    title="Kembali ke daftar pesan"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  {getConvDisplay(activeDetail).isGroup ? (
                    <div className="w-9 h-9 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                      <Users size={16} />
                    </div>
                  ) : (
                    <DiscordAvatar
                      src={getConvDisplay(activeDetail).user?.avatar ?? null}
                      username={getConvDisplay(activeDetail).user?.username ?? null}
                      size={36}
                      className="size-9 rounded-full border border-purple-500/30 shrink-0"
                    />
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-extrabold text-sm text-white truncate">
                        {getConvDisplay(activeDetail).title}
                      </h2>
                      {!activeDetail.isGroup && getConvDisplay(activeDetail).user?.username && (
                        <Link
                          href={`/u/${encodeURIComponent(getConvDisplay(activeDetail).user!.username!)}`}
                          className="text-[10px] font-semibold text-[#C77DFF] hover:underline shrink-0"
                        >
                          Lihat Profil
                        </Link>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-400 truncate">
                      {activeDetail.isGroup
                        ? `${activeDetail.participants.length} anggota grup`
                        : getConvDisplay(activeDetail).subtitle}
                    </p>
                  </div>
                </div>

                {/* Chat Action Header Tools */}
                <div className="flex items-center gap-1.5 shrink-0 relative" ref={menuRef}>
                  {activeDetail.isGroup && (
                    <button
                      onClick={() => {
                        setShowAddMembersModal(true);
                        setAddMembersSelected([]);
                        setMemberSearchQuery("");
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-[#2A1B42] bg-[#0A0612] text-xs font-semibold text-gray-300 hover:text-white hover:border-[#7C3AED] inline-flex items-center gap-1.5 transition-colors"
                      title="Tambah anggota baru"
                    >
                      <UserPlus size={13} />
                      <span className="hidden sm:inline">Tambah Anggota</span>
                    </button>
                  )}

                  {/* 3-Dots Menu Dropdown */}
                  <button
                    onClick={() => setShowConvMenu((prev) => !prev)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Menu opsi obrolan"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {showConvMenu && (
                    <div className="absolute right-0 top-11 w-56 rounded-xl border border-[#2A1B42] bg-[#161024] shadow-2xl p-1.5 z-30 text-xs">
                      <button
                        onClick={handleClearChat}
                        className="w-full text-left px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-purple-950/30 flex items-center gap-2 transition-colors"
                      >
                        <RefreshCw size={14} className="text-amber-400" />
                        <span>Bersihkan Isi Chat</span>
                      </button>

                      {activeDetail.isGroup ? (
                        <button
                          onClick={handleLeaveGroup}
                          className="w-full text-left px-3 py-2 rounded-lg text-red-400 hover:bg-red-950/20 flex items-center gap-2 transition-colors"
                        >
                          <LogOut size={14} />
                          <span>Keluar dari Grup</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleDeleteConversation}
                          className="w-full text-left px-3 py-2 rounded-lg text-red-400 hover:bg-red-950/20 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 size={14} />
                          <span>Hapus Percakapan</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 no-scrollbar">
                {loadingChat ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400 gap-2">
                    <RefreshCw size={14} className="animate-spin text-[#9D4EDD]" />
                    <span>Memuat percakapan...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-4">
                    <EmptyStateCard
                      icon={MessageSquare}
                      title="Ruang Obrolan Siap"
                      description="Kirim pesan pertama atau panggil @satpam untuk asisten bot AI LogHorizon."
                    />
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.senderId === me?.id;
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const showSender = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId);

                    return (
                      <div
                        id={`msg-${msg.id}`}
                        key={msg.id}
                        className={`flex flex-col group relative ${isMe ? "items-end" : "items-start"}`}
                      >
                        {showSender && msg.sender && (
                          <div className="flex items-center gap-1.5 mb-1 ml-1 text-[11px] text-gray-400">
                            <span className="font-semibold text-gray-300">
                              {msg.sender.username || "Petualang"}
                            </span>
                            {msg.sender.role === "ADMIN" && (
                              <span className="text-[9px] px-1 rounded bg-purple-500/20 text-purple-300 font-bold">
                                Prince
                              </span>
                            )}
                          </div>
                        )}

                        <div className="relative max-w-[88%] sm:max-w-[72%]">
                          {/* Message Bubble */}
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm break-words leading-relaxed shadow-sm transition-all ${
                              isMe
                                ? "bg-gradient-to-r from-[#7C3AED] to-[#9D4EDD] text-white rounded-br-xs"
                                : "bg-[#1C152B] text-gray-100 rounded-bl-xs border border-[#2A1B42]"
                            }`}
                          >
                            {/* Quoted Message (WhatsApp Style) */}
                            {msg.replyTo && (
                              <div
                                onClick={() => {
                                  const el = document.getElementById(`msg-${msg.replyTo?.id}`);
                                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                                }}
                                className="mb-2 p-2 rounded-lg bg-black/30 border-l-3 border-[#C77DFF] text-xs cursor-pointer hover:bg-black/40 transition-colors"
                              >
                                <span className="font-bold text-[#C77DFF] text-[11px] block truncate">
                                  {msg.replyTo.sender?.username ?? msg.replyTo.sender?.name ?? "Petualang"}
                                </span>
                                <span className="text-gray-300 text-[11px] block truncate">
                                  {msg.replyTo.isDeleted
                                    ? "🚫 Pesan ini telah dihapus"
                                    : msg.replyTo.content}
                                </span>
                              </div>
                            )}

                            {/* Message Content */}
                            <div>
                              <FormattedChatMessage text={msg.content} isDeleted={msg.isDeleted} />
                            </div>

                            {/* Footer: Timestamp & Sent Checkmarks */}
                            <div className="flex items-center justify-end gap-1 mt-1 text-[10px]">
                              <span className={isMe ? "text-purple-200/80 font-mono" : "text-gray-400 font-mono"}>
                                {new Date(msg.createdAt).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isMe && !msg.isDeleted && (
                                <CheckCheck size={12} className="text-purple-200 shrink-0" />
                              )}
                            </div>
                          </div>

                          {/* Action Toolbar on Hover / Mobile */}
                          {!msg.isDeleted && (
                            <div
                              className={`absolute -top-3 ${
                                isMe ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"
                              } hidden group-hover:flex items-center gap-1 z-10`}
                            >
                              {/* Reply Button */}
                              <button
                                type="button"
                                onClick={() => setReplyingTo(msg)}
                                className="p-1 rounded bg-[#161024] border border-[#2A1B42] text-gray-300 hover:text-white shadow-md hover:border-[#7C3AED]"
                                title="Balas pesan"
                              >
                                <Reply size={12} />
                              </button>

                              {/* Emoji Reactions */}
                              <div className="flex items-center bg-[#161024] border border-[#2A1B42] rounded-lg p-0.5 shadow-md">
                                {EMOJI_OPTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => void handleReaction(msg.id, emoji)}
                                    className="px-1 py-0.5 hover:scale-125 transition-transform text-xs"
                                    title={`Reaksi ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>

                              {/* Delete (Own messages only) */}
                              {isMe && (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteMessage(msg.id)}
                                  className="p-1 rounded bg-[#161024] border border-[#2A1B42] text-gray-400 hover:text-red-400 shadow-md hover:border-red-500/50"
                                  title="Hapus pesan"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Existing Emoji Reaction Counts Display */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                if (!userIds || userIds.length === 0) return null;
                                const hasReacted = me?.id ? userIds.includes(me.id) : false;
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => void handleReaction(msg.id, emoji)}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                                      hasReacted
                                        ? "bg-[#7C3AED]/30 border-[#7C3AED] text-purple-200"
                                        : "bg-[#161024] border-[#2A1B42] text-gray-400 hover:text-white"
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    <span>{userIds.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Section */}
              <div className="border-t border-[#2A1B42] bg-[#161024]">
                {/* Replying Preview Banner */}
                {replyingTo && (
                  <div className="flex items-center justify-between px-4 py-2 bg-[#1C152B] border-l-4 border-[#7C3AED] text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-bold text-[#C77DFF] block truncate">
                        Membalas @{replyingTo.sender?.username ?? replyingTo.sender?.name ?? "Petualang"}
                      </span>
                      <span className="text-gray-400 block truncate text-[11px]">
                        {replyingTo.isDeleted ? "🚫 Pesan ini telah dihapus" : replyingTo.content}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-gray-400 hover:text-white p-1"
                      title="Batal balas"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {/* Chat Send Form */}
                <form onSubmit={handleSendMessage} className="p-3 flex flex-col gap-2">
                  {chatAttachment && (
                    <div className="flex items-center gap-2 p-1.5 px-3 bg-[#7C3AED]/15 border border-[#7C3AED]/30 rounded-lg w-fit max-w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={chatAttachment}
                        alt="Lampiran"
                        className="w-10 h-10 object-cover rounded border border-purple-500/40"
                      />
                      <span className="text-[11px] text-purple-300 font-medium truncate max-w-[180px]">
                        Foto siap dikirim
                      </span>
                      <button
                        type="button"
                        onClick={() => setChatAttachment(null)}
                        className="p-1 hover:text-white text-gray-400"
                        aria-label="Hapus Lampiran"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ImageUploader compact onAttachment={(b64) => setChatAttachment(b64)} />
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Ketik pesan atau mention @satpam..."
                      className="flex-1 h-10 px-3.5 rounded-lg border border-[#2A1B42] bg-[#0A0612] text-xs sm:text-sm text-white placeholder:text-gray-500 focus:border-[#7C3AED] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={(!messageInput.trim() && !chatAttachment) || sending}
                      className="h-10 px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    >
                      <Send size={15} />
                      <span className="hidden sm:inline text-xs">Kirim</span>
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-[#9D4EDD] flex items-center justify-center">
                <MessageSquare size={32} />
              </div>
              <h3 className="font-bold text-base text-white">
                Pilih atau Mulai Obrolan
              </h3>
              <p className="text-xs text-gray-500 max-w-sm">
                Pilih percakapan dari daftar di sebelah kiri, atau buat grup obrolan baru untuk mabar bersama rekan guild.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* MODAL: BUAT GRUP CHAT */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-[#2A1B42] bg-[#161024] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A1B42] pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Users size={18} className="text-[#9D4EDD]" />
                <span>Buat Grup Obrolan Komunitas</span>
              </h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1 text-gray-300">Nama Grup *</label>
                <input
                  required
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="Contoh: Party Rank Mythic"
                  className="w-full h-10 px-3 rounded-lg border border-[#2A1B42] bg-[#0A0612] text-white placeholder:text-gray-500 focus:border-[#7C3AED] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-gray-300">Undang Anggota (Cari Username)</label>
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Ketik minimal 2 huruf username..."
                  className="w-full h-9 px-3 rounded-lg border border-[#2A1B42] bg-[#0A0612] text-white placeholder:text-gray-500 focus:border-[#7C3AED] focus:outline-none"
                />

                {/* Selected members pills */}
                {groupSelectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {groupSelectedUsers.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[11px]"
                      >
                        @{u.username}
                        <button
                          type="button"
                          onClick={() => setGroupSelectedUsers((prev) => prev.filter((x) => x.id !== u.id))}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search result dropdown */}
                {memberSearchResults.length > 0 && (
                  <div className="mt-2 max-h-36 overflow-y-auto border border-[#2A1B42] rounded-lg p-1 bg-[#0A0612] space-y-1">
                    {memberSearchResults.map((u) => {
                      const isAdded = groupSelectedUsers.some((x) => x.id === u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            if (!isAdded) {
                              setGroupSelectedUsers((prev) => [...prev, u]);
                              setMemberSearchQuery("");
                              setMemberSearchResults([]);
                            }
                          }}
                          className={`p-2 rounded flex items-center justify-between cursor-pointer ${
                            isAdded ? "opacity-50" : "hover:bg-purple-500/10"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <DiscordAvatar src={u.avatar ?? null} username={u.username ?? null} size={24} />
                            <span className="font-semibold text-white">
                              {u.username}
                            </span>
                          </div>
                          {isAdded ? (
                            <Check size={14} className="text-purple-400" />
                          ) : (
                            <Plus size={14} className="text-gray-400" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2A1B42]">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="px-4 py-2 rounded-lg border border-[#2A1B42] bg-[#0A0612] text-gray-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!groupNameInput.trim()}
                  className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold transition-colors disabled:opacity-50"
                >
                  Buat Grup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH ANGGOTA GRUP */}
      {showAddMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-[#2A1B42] bg-[#161024] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A1B42] pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <UserPlus size={18} className="text-[#9D4EDD]" />
                <span>Tambah Anggota ke Grup</span>
              </h3>
              <button onClick={() => setShowAddMembersModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMembers} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1 text-gray-300">Cari Anggota Guild</label>
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Ketik minimal 2 huruf username..."
                  className="w-full h-9 px-3 rounded-lg border border-[#2A1B42] bg-[#0A0612] text-white placeholder:text-gray-500 focus:border-[#7C3AED] focus:outline-none"
                />

                {addMembersSelected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {addMembersSelected.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[11px]"
                      >
                        @{u.username}
                        <button
                          type="button"
                          onClick={() => setAddMembersSelected((prev) => prev.filter((x) => x.id !== u.id))}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {memberSearchResults.length > 0 && (
                  <div className="mt-2 max-h-36 overflow-y-auto border border-[#2A1B42] rounded-lg p-1 bg-[#0A0612] space-y-1">
                    {memberSearchResults.map((u) => {
                      const alreadyInGroup = activeDetail?.participants.some((p) => p.userId === u.id);
                      const isAdded = addMembersSelected.some((x) => x.id === u.id);

                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            if (!alreadyInGroup && !isAdded) {
                              setAddMembersSelected((prev) => [...prev, u]);
                              setMemberSearchQuery("");
                              setMemberSearchResults([]);
                            }
                          }}
                          className={`p-2 rounded flex items-center justify-between ${
                            alreadyInGroup || isAdded
                              ? "opacity-40 cursor-not-allowed"
                              : "cursor-pointer hover:bg-purple-500/10"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <DiscordAvatar src={u.avatar ?? null} username={u.username ?? null} size={24} />
                            <span className="font-semibold text-white">
                              {u.username}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {alreadyInGroup ? "Sudah di grup" : isAdded ? "Dipilih" : "+ Tambah"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2A1B42]">
                <button
                  type="button"
                  onClick={() => setShowAddMembersModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#2A1B42] bg-[#0A0612] text-gray-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addMembersSelected.length === 0}
                  className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold transition-colors disabled:opacity-50"
                >
                  Tambahkan ({addMembersSelected.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
