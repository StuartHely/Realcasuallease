import { useState } from "react";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function AIChatAssistant() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (response) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: response,
      }]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to get response from Aria");
      setMessages(prev => prev.slice(0, -1));
    },
  });

  const handleSendMessage = (content: string) => {
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    chatMutation.mutate({ messages: newMessages });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold">Aria — AI Assistant</h1>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <AIChatBox
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={chatMutation.isPending}
          placeholder="Ask Aria about casual leasing, finding spaces, booking help..."
          height="calc(100vh - 140px)"
          emptyStateMessage="Hi! I'm Aria, your casual leasing assistant. How can I help you today?"
          suggestedPrompts={[
            "What spaces are available in Sydney?",
            "How does the booking process work?",
            "What is casual leasing?",
            "Help me find a 3x3 site near Campbelltown",
          ]}
        />
      </main>
    </div>
  );
}
