import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Send, User as UserIcon, Store, Bike } from "lucide-react";
import { supabase } from "@/integrations/client";

interface Convo {
  user_id: string;
  display_name: string;
  email: string;
  role: "customer" | "vendor" | "rider";
  last_body: string;
  last_at: string;
  unread: number;
}

interface Msg {
  id: string;
  body: string;
  sender_is_admin: boolean;
  created_at: string;
}

export function AdminChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [filter, setFilter] = useState<"all" | "customer" | "vendor">("all");
  const [convos, setConvos] = useState<Convo[]>([]);
  const [active, setActive] = useState<Convo | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [adminId, setAdminId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminId(data.user?.id ?? null));
  }, []);

  const loadConvos = async () => {
    const { data } = await supabase
      .from("support_messages")
      .select("conversation_user_id, body, created_at, sender_is_admin, read_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!data) return;
    const byUser = new Map<string, { last_body: string; last_at: string; unread: number }>();
    for (const m of data) {
      const cur = byUser.get(m.conversation_user_id);
      if (!cur)
        byUser.set(m.conversation_user_id, { last_body: m.body, last_at: m.created_at, unread: 0 });
      if (!m.sender_is_admin && !m.read_at) {
        const e = byUser.get(m.conversation_user_id)!;
        e.unread += 1;
      }
    }
    const ids = Array.from(byUser.keys());
    if (ids.length === 0) {
      setConvos([]);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, first_name, last_name, email, role")
      .in("id", ids);
    const out: Convo[] = ids.map((id) => {
      const p = profiles?.find((x) => x.id === id);
      const role: Convo["role"] =
        p?.role === "vendor" ? "vendor" : p?.role === "rider" ? "rider" : "customer";
      const meta = byUser.get(id)!;
      return {
        user_id: id,
        display_name:
          p?.display_name ??
          (`${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || p?.email || "User"),
        email: p?.email ?? "",
        role,
        ...meta,
      };
    });
    out.sort((a, b) => +new Date(b.last_at) - +new Date(a.last_at));
    setConvos(out);
  };

  useEffect(() => {
    if (!open) return;
    loadConvos();

    // Any new message anywhere should refresh the conversation list
    // (new senders appearing, previews updating, unread counts changing).
    const channel = supabase
      .channel("admin-support-conversations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        () => loadConvos(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open]);

  useEffect(() => {
    if (!active) return;

    const markRead = () =>
      supabase
        .from("support_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_user_id", active.user_id)
        .eq("sender_is_admin", false)
        .is("read_at", null);

    // 1. Load the thread once on opening it
    supabase
      .from("support_messages")
      .select("id, body, sender_is_admin, created_at")
      .eq("conversation_user_id", active.user_id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as Msg[]);
        markRead();
      });

    // 2. Subscribe to new messages in this thread, live
    const channel = supabase
      .channel(`admin-support-thread-${active.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_user_id=eq.${active.user_id}`,
        },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => [...prev, m]);
          if (!m.sender_is_admin) markRead();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !active || !adminId) return;
    setDraft("");
    await supabase.from("support_messages").insert({
      conversation_user_id: active.user_id,
      sender_id: adminId,
      sender_is_admin: true,
      body,
    });
  };

  const filtered = convos.filter((c) => filter === "all" || c.role === filter);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setActive(null);
      }}
    >
      <DialogContent className="max-w-md p-0 gap-0 max-h-[85vh] overflow-hidden flex flex-col">
        {!active ? (
          <>
            <div className="p-4 border-b border-border">
              <DialogTitle>Conversations</DialogTitle>
              <DialogDescription>Messages from customers and vendors.</DialogDescription>
              <div className="mt-3 grid grid-cols-3 gap-1 p-1 rounded-xl bg-secondary">
                {(["all", "customer", "vendor"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`h-8 rounded-lg text-xs font-semibold capitalize ${
                      filter === f
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No conversations yet.
                </p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.user_id}
                    onClick={() => setActive(c)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border text-left active:scale-[0.99]"
                  >
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        c.role === "vendor"
                          ? "bg-primary/10 text-primary"
                          : c.role === "rider"
                            ? "bg-cta/10 text-cta"
                            : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {c.role === "vendor" ? (
                        <Store className="h-4 w-4" />
                      ) : c.role === "rider" ? (
                        <Bike className="h-4 w-4" />
                      ) : (
                        <UserIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {c.display_name}
                        </p>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {c.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{c.last_body}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-cta text-cta-foreground text-[10px] font-bold flex items-center justify-center">
                        {c.unread}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 p-3 border-b border-border bg-primary text-primary-foreground">
              <button
                onClick={() => setActive(null)}
                className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-sm truncate">{active.display_name}</DialogTitle>
                <p className="text-[10px] opacity-80 capitalize">
                  {active.role} · {active.email}
                </p>
              </div>
            </div>
            <div
              ref={scrollRef}
              className="h-80 flex-1 overflow-y-auto p-3 space-y-2 bg-background"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender_is_admin ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      m.sender_is_admin
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 p-3 border-t border-border bg-card"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={4000}
                placeholder="Reply…"
                className="flex-1 h-10 px-3 rounded-xl bg-input border border-border text-sm"
              />
              <button
                type="submit"
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:scale-95"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}