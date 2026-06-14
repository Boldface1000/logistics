import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { supabase } from "@/integrations/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Msg {
  id: string;
  body: string;
  sender_is_admin: boolean;
  created_at: string;
}

/**
 * Floating support chat used by customers and vendors.
 * Polls every 5s for new messages from any admin.
 */
export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const fetchMsgs = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("id, body, sender_is_admin, created_at")
        .eq("conversation_user_id", userId)
        .order("created_at", { ascending: true });
      if (!alive || !data) return;
      setMessages(data as Msg[]);
      if (!open) {
        setUnread(
          data.filter((m) => m.sender_is_admin && !messages.find((x) => x.id === m.id)).length,
        );
      }
    };
    fetchMsgs();
    const t = setInterval(fetchMsgs, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, open]);

  useEffect(() => {
    if (open) setUnread(0);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !userId) return;
    setDraft("");
    const { error } = await supabase.from("support_messages").insert({
      conversation_user_id: userId,
      sender_id: userId,
      sender_is_admin: false,
      body,
    });
    if (error) console.error(error);
  };

  if (!userId) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Chat with support"
        className="sticky bottom-20 ml-auto mr-4 z-40 h-14 w-14 rounded-full bg-cta text-cta-foreground flex items-center justify-center shadow-2xl active:scale-95 transition"
      >
        <MessageCircle className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
            {unread}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">Support chat</DialogTitle>
          <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
            <div>
              <p className="font-bold text-sm">EasyBlue Support</p>
              <p className="text-[10px] opacity-80">Usually replies within a few minutes</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={scrollRef} className="h-80 overflow-y-auto p-3 space-y-2 bg-background">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                Send us a message — we'll get back to you shortly.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender_is_admin ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    m.sender_is_admin
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground"
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
              placeholder="Type a message…"
              className="flex-1 h-10 px-3 rounded-xl bg-input border border-border text-sm"
            />
            <button
              type="submit"
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
