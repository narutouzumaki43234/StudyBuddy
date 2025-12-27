import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, User } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { motion, AnimatePresence } from "framer-motion";

export function ChatInterface() {
  const { messages, sendMessage, isPending } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm rounded-none md:rounded-l-3xl border-l border-border/50 overflow-hidden relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-b border-border/50 z-10 flex items-center px-6">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mr-3 text-primary">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg">Study Assistant</h2>
          <p className="text-xs text-muted-foreground">Always here to help you learn</p>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-20 pb-4 px-4 md:px-8 space-y-6 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center shrink-0
                ${msg.role === 'ai' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
              `}>
                {msg.role === 'ai' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              
              <div className={`
                p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words
                ${msg.role === 'ai' 
                  ? 'bg-card border border-border/50 text-foreground rounded-tl-none' 
                  : 'bg-primary text-primary-foreground rounded-tr-none shadow-primary/20'}
              `}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          
          {isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 max-w-3xl"
            >
               <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-card border border-border/50 p-4 rounded-2xl rounded-tl-none flex gap-2 items-center h-12">
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-background/80 backdrop-blur-md border-t border-border/50">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about physics, math, or request a study task..."
            disabled={isPending}
            className="
              w-full pl-6 pr-14 py-4 rounded-2xl
              bg-muted/50 border border-border/50
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10
              transition-all duration-200
            "
          />
          <button
            type="submit"
            disabled={!input.trim() || isPending}
            className="
              absolute right-2 top-2 bottom-2 aspect-square
              bg-primary text-primary-foreground rounded-xl
              flex items-center justify-center
              hover:bg-primary/90 hover:scale-95 active:scale-90
              disabled:opacity-50 disabled:pointer-events-none
              transition-all duration-200 shadow-lg shadow-primary/25
            "
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="text-center mt-3 text-xs text-muted-foreground">
          Study Assistant can make mistakes. Double check important info.
        </div>
      </div>
    </div>
  );
}
