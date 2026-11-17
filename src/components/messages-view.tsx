"use client";

import { useEffect, useRef, useState, FormEvent, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Check,
  Crown,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { DiscordAvatar } from "@/components/discord-avatar";
import { readApiResponse } from "@/lib/api-response";
import { ImageUploader } from "@/components/ui/image-uploader";

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

function FormattedChatMessage({ text }: { text: string }) {
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
  const targetUserParam = searchParams.get("user");

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

  const me = session?.user;

  // Auto scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await readApiResponse<{ conversations: ConversationSummary[] }>(
        res,
        "Gagal memuat daftar obrolan."
      );
      setConversations(data.conversations || []);
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

  // Fetch full active conversation detail
  const loadConversationDetail = useCallback(async (convId: string) => {
    setLoadingChat(true);
    setError("");
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      const data = await readApiResponse<{ conversation: ConversationDetail }>(
        res,
        "Gagal memuat detail percakapan."
      );
      setActiveDetail(data.conversation);
      setMessages(data.conversation.messages || []);

      if (data.conversation.messages.length > 0) {
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
      lastMessageTimestampRef.current = null;
    }
  }, [activeConvId, loadConversationDetail]);

  // Efficient Polling Mechanism (4-5s interval, only while document is visible)
  useEffect(() => {
    if (!activeConvId) return;

    const interval = setInterval(async () => {
      // Don't poll if document is hidden (user minimized or switched tabs)
      if (typeof document !== "undefined" && document.hidden) return;

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
    }, 4500);

    return () => clearInterval(interval);
  }, [activeConvId, scrollToBottom]);

  // Send message
  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    const text = messageInput.trim();
    if ((!text && !chatAttachment) || !activeConvId || sending) return;

    setSending(true);
    let content = text;
    if (chatAttachment) {
      content = content ? `${content}\n\n![Gambar](${chatAttachment})` : `![Gambar](${chatAttachment})`;
    }
    setMessageInput("");
    setChatAttachment(null);

    try {
      const res = await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await readApiResponse<{ message: MessageItem }>(res, "Gagal mengirim pesan.");
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        lastMessageTimestampRef.current = data.message.createdAt;
        scrollToBottom(true);

        // Update lastMessage in conversation list
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
    } finally {
      setSending(false);
    }
  }

  // Member search for group creation & adding
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
    if (!confirm("Apakah kamu yakin ingin keluar dari obrolan ini?")) return;

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
    // 1-on-1: find the other participant
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
    <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <span className="text-[11px] font-mono text-[#9D4EDD] uppercase tracking-widest font-bold block">
            Direct Messaging &amp; Party Lounge
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
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
          className="button button-primary text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
        >
          <Plus size={15} />
          <span>Buat Grup Chat</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-none border border-red-500/30 bg-red-950/20 text-red-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      {/* Main Dual-Column Panel */}
      <div className="h-[76vh] min-h-[520px] rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-xl overflow-hidden flex">
        {/* LEFT COLUMN: CONVERSATION LIST */}
        <aside
          className={`w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-[#2E1E45] flex flex-col bg-gray-50/50 dark:bg-[#100D16] ${
            activeConvId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search Box */}
          <div className="p-3.5 border-b border-gray-200 dark:border-[#2E1E45]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari obrolan / teman..."
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16121E] text-xs placeholder:text-gray-400 focus:border-[#9D4EDD] focus:outline-none"
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
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
            {loadingList ? (
              <div className="p-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-[#9D4EDD]" />
                <span>Memuat pesan...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                <p>Belum ada obrolan.</p>
                <p className="text-[11px] text-gray-500">
                  Mulai PM dari profil petualang, lapak marketplace, atau buat grup baru.
                </p>
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
                        ? "bg-[#9D4EDD]/10 border-l-4 border-[#9D4EDD]"
                        : "hover:bg-gray-100/70 dark:hover:bg-white/5"
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
                        <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          {disp.title}
                        </span>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {new Date(conv.lastMessage.createdAt).toLocaleDateString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {conv.lastMessage?.content || "Belum ada pesan"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#9D4EDD] text-white shrink-0">
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
          className={`flex-1 flex flex-col bg-white dark:bg-[#130921] ${
            !activeConvId ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConvId && activeDetail ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2E1E45] flex items-center justify-between gap-3 bg-white dark:bg-[#130921]">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/5"
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
                      <h2 className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                        {getConvDisplay(activeDetail).title}
                      </h2>
                      {!activeDetail.isGroup && getConvDisplay(activeDetail).user?.username && (
                        <Link
                          href={`/u/${encodeURIComponent(getConvDisplay(activeDetail).user!.username!)}`}
                          className="text-[10px] font-semibold text-[#9D4EDD] hover:underline shrink-0"
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

                <div className="flex items-center gap-2">
                  {activeDetail.isGroup && (
                    <>
                      <button
                        onClick={() => {
                          setShowAddMembersModal(true);
                          setAddMembersSelected([]);
                          setMemberSearchQuery("");
                        }}
                        className="button button-quiet text-xs font-semibold inline-flex items-center gap-1 py-1 px-2.5"
                        title="Tambah anggota baru"
                      >
                        <UserPlus size={13} />
                        <span className="hidden sm:inline">Tambah Anggota</span>
                      </button>
                      <button
                        onClick={handleLeaveGroup}
                        className="p-1.5 rounded text-red-400 hover:bg-red-950/20"
                        title="Keluar dari grup"
                      >
                        <LogOut size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                {loadingChat ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400 gap-2">
                    <RefreshCw size={14} className="animate-spin text-[#9D4EDD]" />
                    <span>Memuat obrolan...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-1">
                    <p className="text-xs font-bold text-gray-300">Belum ada percakapan.</p>
                    <p className="text-[11px] text-gray-500">Kirim pesan pertama untuk memulai obrolan!</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.senderId === me?.id;
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const showSender = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId);

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        {showSender && msg.sender && (
                          <div className="flex items-center gap-1.5 mb-1 ml-1 text-[11px] text-gray-400">
                            <span className="font-semibold text-gray-300">
                              {msg.sender.username || "Petualang"}
                            </span>
                            {msg.sender.role === "ADMIN" && (
                              <span className="text-[9px] px-1 rounded bg-purple-500/20 text-purple-300">
                                Prince
                              </span>
                            )}
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-none text-xs sm:text-sm break-words leading-relaxed shadow-sm ${
                            isMe
                              ? "bg-gradient-to-r from-[#8338ec] to-[#9D4EDD] text-white rounded-br-xs"
                              : "bg-gray-100 dark:bg-[#1C1726] text-gray-900 dark:text-gray-100 rounded-bl-xs border border-gray-200/50 dark:border-white/5"
                          }`}
                        >
                          <div><FormattedChatMessage text={msg.content} /></div>
                          <span
                            className={`text-[10px] block mt-1 text-right ${
                              isMe ? "text-purple-200/80" : "text-gray-400"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Send Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] flex flex-col gap-2"
              >
                {chatAttachment && (
                  <div className="flex items-center gap-2 p-1.5 px-3 bg-[#9D4EDD]/15 border border-[#9D4EDD]/30 rounded-none w-fit max-w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={chatAttachment} alt="Lampiran" className="w-10 h-10 object-cover rounded border border-purple-500/40" />
                    <span className="text-[11px] text-purple-300 font-medium truncate max-w-[180px]">Foto siap dikirim</span>
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
                    placeholder="Ketik pesan..."
                    className="flex-1 h-10 px-3.5 rounded-none border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#16121E] text-xs sm:text-sm focus:border-[#9D4EDD] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={(!messageInput.trim() && !chatAttachment) || sending}
                    className="button button-primary h-10 px-4 rounded-none font-bold inline-flex items-center gap-1.5"
                  >
                    <Send size={15} />
                    <span className="hidden sm:inline">Kirim</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400 space-y-3">
              <div className="w-14 h-14 rounded-none bg-purple-500/10 border border-purple-500/20 text-[#9D4EDD] flex items-center justify-center">
                <MessageSquare size={28} />
              </div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Pilih atau Mulai Obrolan
              </h3>
              <p className="text-xs text-gray-500 max-w-sm">
                Pilih obrolan dari daftar sebelah kiri, atau buat grup obrolan baru untuk bermain bersama rekan guild.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* MODAL: BUAT GRUP CHAT */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A1B42] pb-3">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={18} className="text-[#9D4EDD]" />
                <span>Buat Grup Obrolan Komunitas</span>
              </h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1">Nama Grup *</label>
                <input
                  required
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="Contoh: Party Rank Mythic"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16121E]"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Undang Anggota (Cari Username)</label>
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Ketik minimal 2 huruf username..."
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16121E]"
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
                  <div className="mt-2 max-h-36 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg p-1 bg-white dark:bg-[#16121E] space-y-1">
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
                            <span className="font-semibold text-gray-900 dark:text-white">
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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#2E1E45]">
                <button type="button" onClick={() => setShowCreateGroup(false)} className="button button-quiet">
                  Batal
                </button>
                <button type="submit" disabled={!groupNameInput.trim()} className="button button-primary font-bold">
                  Buat Grup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH ANGGOTA GRUP */}
      {showAddMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A1B42] pb-3">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus size={18} className="text-[#9D4EDD]" />
                <span>Tambah Anggota ke Grup</span>
              </h3>
              <button onClick={() => setShowAddMembersModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMembers} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1">Cari Anggota Guild</label>
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Ketik minimal 2 huruf username..."
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16121E]"
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
                  <div className="mt-2 max-h-36 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg p-1 bg-white dark:bg-[#16121E] space-y-1">
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
                            <span className="font-semibold text-gray-900 dark:text-white">
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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#2E1E45]">
                <button type="button" onClick={() => setShowAddMembersModal(false)} className="button button-quiet">
                  Batal
                </button>
                <button type="submit" disabled={addMembersSelected.length === 0} className="button button-primary font-bold">
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
