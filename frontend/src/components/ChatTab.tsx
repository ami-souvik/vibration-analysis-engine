import { useState, useRef, useEffect } from "react";
import { Send, Terminal } from "lucide-react";

interface Message {
  id: string;
  sender: "system" | "user" | "engine";
  text: string;
  data?: any;
}

export default function ChatTab() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "system",
      text: "Diagnostic engine connected. Describe the machine state and vibration readings to begin.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/diagnose/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: userMessage.text }),
      });

      const data = await response.json();

      if (data.status === "missing_fields") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "engine",
            text: `Missing required fields to perform calculation: ${data.missing.join(
              ", "
            )}. Please provide them.`,
            data: data.params,
          },
        ]);
      } else if (data.status === "success") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "engine",
            text: data.narration || `Diagnosis Complete.\nVerdict: ${data.result.acceptance_verdict}`,
            data: data.result,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "engine",
            text: `Error processing request: ${data.detail || "Unknown error"}`,
          },
        ]);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "system",
          text: `Connection error: ${error.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <div className="flex items-center gap-2 mb-1 text-xs text-gray-500 uppercase tracking-widest">
              {msg.sender === "system" && <Terminal size={12} />}
              {msg.sender}
            </div>
            <div
              className={`p-4 max-w-[80%] whitespace-pre-wrap rounded-sm border ${
                msg.sender === "user"
                  ? "bg-[#1a1a1a] border-border-color text-foreground"
                  : msg.sender === "system"
                  ? "bg-transparent border-dashed border-accent-gold/50 text-accent-gold"
                  : "bg-[#0f1510] border-accent-green/30 text-accent-green"
              }`}
            >
              {msg.text}
              {msg.data && msg.sender === "engine" && (
                <pre className="mt-4 p-3 bg-black/50 rounded text-xs overflow-x-auto border border-border-color/50 text-gray-300">
                  {JSON.stringify(msg.data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-accent-gold text-sm animate-pulse">
            <span className="h-2 w-2 bg-accent-gold rounded-full"></span>
            PROCESSING TELEMETRY...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border-color bg-background">
        <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest font-semibold">
          Operator Input — Describe Machine State
        </label>
        <div className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="e.g. Screw Compressor, 1480 RPM, 4 male / 6 female lobes, Group 1 rigid. Peak at 24.6 Hz."
            className="flex-1 bg-[#111] border border-border-color p-4 focus:outline-none focus:border-accent-gold transition-colors text-foreground placeholder:text-gray-600 rounded-sm"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-accent-gold hover:bg-yellow-400 text-black px-8 font-bold flex items-center gap-2 disabled:opacity-50 transition-colors uppercase tracking-wider rounded-sm"
          >
            <Send size={18} />
            Transmit
          </button>
        </div>
      </div>
    </div>
  );
}
