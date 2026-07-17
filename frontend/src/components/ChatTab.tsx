import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  sender: "system" | "user" | "engine";
  text: string;
  data?: any;
}

export default function ChatTab() {
  const [messages, setMessages] = useState<Message[]>([]);
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

      if (data.status === "conversation") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "engine",
            text: data.reply,
          },
        ]);
      } else if (data.status === "missing_fields") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "engine",
            text: `Missing required fields to perform calculation: ${data.missing.join(", ")}. Please provide them.`,
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
    <div className="flex-1 flex flex-col h-full bg-bg-base">
      <div className="flex-1 overflow-y-auto space-y-6 pb-6">
        <div className="border border-green bg-green/5 rounded-md px-3 py-2 flex items-center gap-[10px] mx-3 mt-3">
          <span className="size-1.5 rounded-full bg-green"></span>
          <span className="text-green font-mono text-[0.8em] tracking-wider">
            {
              messages.length > 0 ? "Response received."
                : "Diagnostic engine connected. Describe the vibration in screw compressor to begin."
            }
          </span>
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-4 mx-6">
            <div className={`size-[38px] border rounded flex items-center justify-center font-mono text-[0.65em] font-semibold tracking-wider shrink-0 mt-[2px] ${msg.sender === "user" ? "border-border-soft text-text-mute bg-bg-elev" : "border-accent text-accent bg-bg-deep"
              }`}>
              {msg.sender === "user" ? "OPR" : "VDX"}
            </div>
            <div className="flex-1 flex flex-col">
              <div className={`text-[0.65em] font-mono font-bold tracking-widest uppercase mb-1.5 ${msg.sender === "user" ? "text-text-mute" : "text-accent"
                }`}>
                {msg.sender === "user" ? "OPERATOR" : "DIAGNOSTIC ENGINE"}
              </div>
              <div className="text-text text-[0.95em] whitespace-pre-wrap leading-[1.6]">
                {msg.text}
                {msg.data && msg.sender === "engine" && (
                  <pre className="mt-4 p-3 bg-bg-deep rounded text-xs overflow-x-auto border border-border text-text-dim">
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-[10px] text-accent text-xs font-mono uppercase tracking-widest mx-6 ml-[66px] animate-pulse">
            <span className="h-1.5 w-1.5 bg-accent rounded-full shadow-[0_0_8px_var(--accent)]"></span>
            PROCESSING TELEMETRY...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 shrink-0">
        <div className="border border-accent rounded-lg flex flex-col px-3 py-2 bg-bg-elev">
          <div className="flex items-center gap-2 text-accent font-mono text-[0.72em] uppercase font-bold tracking-widest mb-2">
            <span className="opacity-60">&gt;</span> OPERATOR INPUT &mdash; DESCRIBE MACHINE STATE
          </div>
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your query here — e.g. Vibration analysis of screw compressor with anti friction bearings..."
              className="flex-1 bg-transparent rounded-md border border-border-soft pl-4 focus:outline-none text-text placeholder:text-text-dim resize-none text-[0.9em] leading-relaxed"
              rows={4}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-accent hover:bg-yellow-400 text-black p-4 font-bold flex items-center justify-center disabled:opacity-50 transition-colors uppercase tracking-widest rounded-md text-[0.8em]"
            >
              TRANSMIT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
