import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function FloatingChat() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (response) => {
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to get response from Aria");
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const handleSendMessage = (content: string) => {
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    chatMutation.mutate({ messages: newMessages });
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-[1000] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col
            right-6 bottom-[88px] w-[370px] h-[500px]
            max-sm:right-0 max-sm:bottom-0 max-sm:w-full max-sm:h-[calc(100%-60px)] max-sm:rounded-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-[#1A6FA0] rounded-t-2xl max-sm:rounded-t-none">
            <div className="flex items-center gap-2 text-white">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold text-sm">Aria — AI Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden">
            <AIChatBox
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={chatMutation.isPending}
              placeholder="Ask Aria anything..."
              height="100%"
              emptyStateMessage="Hi! I'm Aria, your casual leasing assistant. How can I help you today?"
              suggestedPrompts={[
                "How does the booking process work?",
                "What insurance do I need?",
                "Help me find a space",
              ]}
            />
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed z-[1000] right-6 bottom-6 flex items-center gap-2 bg-[#1A6FA0] text-white shadow-lg
          hover:bg-[#155a84] transition-all rounded-full px-4 py-3"
        aria-label="Open AI Assistant"
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium whitespace-nowrap max-sm:hidden">Your AI Casual Leasing Assistant</span>
            <span className="text-sm font-medium sm:hidden">Ask Aria</span>
          </>
        )}
      </button>
    </>
  );
}
