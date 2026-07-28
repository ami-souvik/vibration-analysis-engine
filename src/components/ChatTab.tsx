"use client";

import { useState, useRef, useEffect } from "react";

export interface Message {
  id: string;
  sender: "system" | "user" | "engine";
  text: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

function FormattedText({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-[0.95em] leading-[1.6]">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        const leadingSpaces = line.search(/\S|$/);
        const indentClass =
          leadingSpaces >= 8
            ? "ml-8"
            : leadingSpaces >= 4
              ? "ml-4"
              : leadingSpaces >= 2
                ? "ml-2"
                : "";

        const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
        const contentText = isBullet ? trimmed.slice(2) : line;

        const isHeader =
          !isBullet &&
          (trimmed.endsWith(":") ||
            trimmed.startsWith("Thank you") ||
            trimmed.includes("Diagnostic"));

        const renderFormattedInline = (str: string) => {
          const parts = str.split(/(\*\*.*?\*\*)/g);
          return parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={i} className="font-semibold text-text">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={i}>{part}</span>;
          });
        };

        if (isHeader) {
          return (
            <div
              key={idx}
              className={`font-mono font-bold text-accent tracking-wide mt-3 mb-1 ${indentClass}`}
            >
              {renderFormattedInline(trimmed)}
            </div>
          );
        }

        if (isBullet) {
          return (
            <div key={idx} className={`flex items-start gap-2 ${indentClass}`}>
              <span className="text-accent shrink-0 font-mono mt-[3px] text-[0.7em]">
                &#9670;
              </span>
              <span className="text-text-mute">
                {renderFormattedInline(contentText)}
              </span>
            </div>
          );
        }

        return (
          <div key={idx} className={`text-text-mute ${indentClass}`}>
            {renderFormattedInline(line)}
          </div>
        );
      })}
    </div>
  );
}

interface ChatTabProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export default function ChatTab({ messages, setMessages }: ChatTabProps) {
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

    // Accumulate all operator inputs to send to the parser
    const allUserMessages = [...messages, userMessage]
      .filter((m) => m.sender === "user")
      .map((m) => m.text)
      .join("\n---\n");

    try {
      const response = await fetch("/api/diagnose/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: allUserMessages }),
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
        const fieldLabels: Record<string, string> = {
          motor_rpm: "Speed in RPM",
          male_lobes: "Number of male lobes",
          female_lobes: "Number of female lobes",
          foundation_type: "Foundation type (Rigid or Flexible)",
          machine_group: "Machine group (e.g. Group 2 Oil-Free, Group 3 Oil-Flooded)",
          bearing_numbers: "Bearing numbers (e.g. 7309 DE, NU 309 NDE)",
          measured_peaks: "At least one peak frequency in Hz",
          overall_vibration_rms: "Overall vibration (mm/sec RMS)"
        };

        const bullets = data.missing.map((f: string) => `* ${fieldLabels[f] || f}`).join('\n');

        // Count user messages to determine if this is the first interaction
        const userMessageCount = messages.filter(m => m.sender === "user").length;
        const text = userMessageCount === 1
          ? `Hello! I'm ready to help diagnose your machine.\n\nTo start, please provide the following information:\n${bullets}`
          : `Thank you. I still need the following to proceed:\n${bullets}`;

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "engine",
            text: text,
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
            text: `Error processing request: ${data.detail || data.error || "Unknown error"}`,
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "system",
          text: `Connection error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-base">
      <div className="border border-[#3fb9504d] bg-[#3fb9500d] rounded-md px-3 py-2 flex items-center gap-[10px] m-4 md:m-7">
        <span className="size-1.5 rounded-full bg-green"></span>
        <span className="text-green font-mono text-[0.78em] tracking-wider">
          {
            messages.length > 0 ? "Response received."
              : "Diagnostic engine connected. Describe the vibration in screw compressor to begin."
          }
        </span>
      </div>
      <div className="max-w-[880px] mx-auto flex-1 overflow-y-auto space-y-6 pb-6">
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
              <div className="text-text">
                <FormattedText text={msg.text} />
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

      <div className="p-4 md:px-7 shrink-0">
        <div className="border border-accent rounded-lg flex flex-col px-3 py-2 bg-bg-elev">
          <div className="flex items-center text-accent font-mono text-display-xs uppercase font-bold tracking-widest mb-2 before:content-['›'] before:text-[12px] before:text-accent before:mr-2">
            OPERATOR INPUT &mdash; DESCRIBE MACHINE STATE
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
              placeholder="Type your query here - e.g. Vibration analysis of screw compressor with anti friction bearings..."
              className="flex-1 bg-transparent rounded-md border border-border pl-2 pt-2 focus:outline-none text-text placeholder:text-text-dim resize-none text-tight-xs leading-relaxed"
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
