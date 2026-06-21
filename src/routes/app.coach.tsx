import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Bot, User as UserIcon, Plus, MessageSquare } from "lucide-react";
import { sendMessage } from "@/services/ai-provider";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/coach")({
  head: () => ({ meta: [{ title: "EcoAI Coach — CarbonLens AI" }] }),
  component: Coach,
});

const suggestedPrompts = [
  "What is my biggest emission source?",
  "How can I cut my transport footprint?",
  "Explain carbon offsets simply",
  "Build me a 30-day reduction plan",
];

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

function Coach() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [initialSelectDone, setInitialSelectDone] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [typing]);

  // Query past conversations
  const { data: conversations, isLoading: loadingConvs } = useQuery({
    queryKey: ["ai_conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Set default active conversation if any exist on initial load
  useEffect(() => {
    if (conversations && conversations.length > 0 && !initialSelectDone) {
      setActiveConvId(conversations[0].id);
      setInitialSelectDone(true);
    }
  }, [conversations, initialSelectDone]);

  // Query messages for active conversation
  const { data: messages, isLoading: loadingMsgs } = useQuery({
    queryKey: ["ai_messages", activeConvId],
    queryFn: async () => {
      if (!activeConvId) return [];
      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", activeConvId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Msg[];
    },
    enabled: !!activeConvId,
  });

  // Scroll to bottom when messages load
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mutation to send a message
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      setTyping(true);
      try {
        const res = await sendMessage(text, activeConvId || undefined);
        return res;
      } finally {
        setTyping(false);
      }
    },
    onSuccess: (res) => {
      if (res) {
        const convId = res.conversationId;

        // Seeding cache to prevent loader skeleton flicker for first message
        if (!activeConvId) {
          const optimisticData = queryClient.getQueryData<Msg[]>(["ai_messages", null]);
          if (optimisticData && optimisticData.length > 0) {
            const realUserMsg: Msg = {
              ...optimisticData[0],
            };
            const aiMsg: Msg = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: res.response,
              created_at: new Date().toISOString(),
            };
            queryClient.setQueryData(["ai_messages", convId], [realUserMsg, aiMsg]);
          }
        }

        if (activeConvId !== convId) {
          setActiveConvId(convId);
          queryClient.invalidateQueries({ queryKey: ["ai_conversations", user?.id] });
        }

        queryClient.invalidateQueries({ queryKey: ["ai_messages", convId] });
      }
      setInput("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send message to EcoAI.");
    },
  });

  const handleSend = (text: string) => {
    if (!text.trim() || typing) return;

    // Optimistic UI updates
    const tempId = crypto.randomUUID();
    const optimisticMessage: Msg = {
      id: tempId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    queryClient.setQueryData(["ai_messages", activeConvId], (prev: Msg[] | undefined) => {
      return [...(prev || []), optimisticMessage];
    });

    sendMessageMutation.mutate(text);
  };

  const startNewConversation = () => {
    setActiveConvId(null);
    queryClient.setQueryData(["ai_messages", null], []);
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar Channels - Desktop only */}
      <div className="hidden w-64 shrink-0 flex-col rounded-2xl border border-white/5 bg-card/20 p-4 sm:flex">
        <button
          type="button"
          onClick={startNewConversation}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-foreground hover:bg-white/10 transition-colors"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>

        <div className="mt-4 flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
            History
          </p>
          {loadingConvs ? (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-9 w-full bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : conversations && conversations.length > 0 ? (
            conversations.map((c) => {
              const active = activeConvId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveConvId(c.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium truncate transition-all ${
                    active
                      ? "bg-primary/20 text-foreground shadow-[inset_0_0_0_1px_var(--primary)]"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.title || "Untitled chat"}</span>
                </button>
              );
            })
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground px-2">
              No conversations yet
            </div>
          )}
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex flex-1 flex-col justify-between">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="grid h-10 w-10 place-items-center rounded-xl gradient-eco glow-eco">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-eco" />
            </div>
            <div>
              <h1 className="text-base font-semibold">EcoAI Coach</h1>
              <p className="text-xs text-muted-foreground">
                Personalized sustainability assistant · Gemini 2.5 Flash
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startNewConversation}
            className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-xs sm:hidden hover:bg-white/5"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>

        {/* Messages list */}
        <div className="glass flex-1 overflow-y-auto rounded-2xl p-4 sm:p-6 mb-3">
          <div className="mx-auto max-w-3xl space-y-4">
            {loadingMsgs ? (
              <div className="space-y-4">
                <div className="h-10 w-2/3 bg-white/5 rounded-2xl animate-pulse" />
                <div className="h-14 w-1/2 bg-white/5 rounded-2xl animate-pulse self-end ml-auto" />
                <div className="h-16 w-3/4 bg-white/5 rounded-2xl animate-pulse" />
              </div>
            ) : messages && messages.length > 0 ? (
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.role === "assistant" ? "gradient-eco" : "bg-white/10"}`}
                    >
                      {m.role === "assistant" ? (
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      ) : (
                        <UserIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        m.role === "assistant"
                          ? "bg-white/5 border border-white/[0.03]"
                          : "gradient-eco text-primary-foreground"
                      }`}
                    >
                      {formatText(m.content)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5">
                  <Bot className="h-6 w-6 text-eco" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Start your sustainability chat</p>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Ask EcoAI about your transportation carbon load, eco-simulator targets, or
                    custom reduction roadmaps.
                  </p>
                </div>
              </div>
            )}

            {typing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full gradient-eco">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-white/5 px-4 py-3 border border-white/[0.03]">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-2 w-2 rounded-full bg-eco"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* Suggested prompts */}
        {(!messages || messages.length === 0) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestedPrompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSend(p)}
                disabled={typing}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground hover:border-eco/40 hover:text-foreground transition-colors disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-card/60 p-2 backdrop-blur"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={typing}
            placeholder="Ask EcoAI anything about your carbon load…"
            className="flex-1 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className="grid h-10 w-10 place-items-center rounded-xl gradient-eco text-primary-foreground disabled:opacity-50 transition-all hover:scale-[1.02]"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function formatText(text: string) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Match bullet lists
        const isBullet =
          line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*");
        const cleanLine = isBullet ? line.trim().substring(1).trim() : line;

        // Match markdown bolding: **text**
        const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
        const content = parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={j} className="font-semibold text-foreground">
              {p.slice(2, -2)}
            </strong>
          ) : (
            <span key={j}>{p}</span>
          ),
        );

        if (isBullet) {
          return (
            <ul key={i} className="list-disc pl-4 space-y-1">
              <li className="text-sm">{content}</li>
            </ul>
          );
        }

        return <p key={i}>{content}</p>;
      })}
    </div>
  );
}
