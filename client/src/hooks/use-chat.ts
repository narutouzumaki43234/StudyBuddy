import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useState } from "react";

export type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
};

export function useChat() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: "Hello! I'm your study assistant. I can help you with your class 9-12 subjects and assign you timed study tasks. What are we studying today?",
      timestamp: new Date(),
    }
  ]);

  const mutation = useMutation({
    mutationFn: async (messageText: string) => {
      // Optimistically add user message
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: messageText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);

      const selectedClass = (localStorage.getItem('selectedClass') || '9') as '9' | '10' | '11' | '12';
      const validated = api.chat.message.input.parse({ message: messageText, class: selectedClass });
      const res = await fetch(api.chat.message.path, {
        method: api.chat.message.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to send message");
      return api.chat.message.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: data.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);

      // If a task was assigned, refresh the task list
      if (data.task) {
        queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
      }
    },
    onError: () => {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'ai',
          content: "I'm having trouble connecting right now. Please try again.",
          timestamp: new Date(),
        }
      ]);
    }
  });

  return {
    messages,
    sendMessage: mutation.mutate,
    isPending: mutation.isPending
  };
}
