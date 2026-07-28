"use client";

import { Message } from "./ChatTab";

interface ReportTabProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export default function ReportTab({ messages, setMessages }: ReportTabProps) {
  
  // Group messages into Q/A pairs
  const exchanges: { question: Message; answer: Message | null; timestamp: string }[] = [];
  
  let currentQuestion: Message | null = null;
  
  // A naive pairing logic assuming conversation flows as User -> Engine
  messages.forEach((msg) => {
    if (msg.sender === "user") {
      if (currentQuestion) {
        // Unanswered previous question
        const q = currentQuestion as Message;
        exchanges.push({ question: q, answer: null, timestamp: new Date(parseInt(q.id)).toLocaleString() });
      }
      currentQuestion = msg;
    } else if (msg.sender === "engine") {
      if (currentQuestion) {
        exchanges.push({ question: currentQuestion, answer: msg, timestamp: new Date(parseInt(msg.id)).toLocaleString() });
        currentQuestion = null;
      }
    }
  });
  
  if (currentQuestion) {
    const q = currentQuestion as Message;
    exchanges.push({ question: q, answer: null, timestamp: new Date(parseInt(q.id)).toLocaleString() });
  }

  // Format markdown-like syntax natively for bold text
  const formatText = (text: string) => {
    // This simple regex replaces **bold** with <strong>bold</strong>
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-white">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-[18px] flex flex-col gap-8 text-sm">
      <div className="flex flex-col">
        <h3 className="text-text-dim font-mono tracking-widest uppercase mb-4 text-xs">{"// Session Diagnostic Report"}</h3>
        <p className="text-text-mute text-sm mb-6">{exchanges.length} diagnostic exchanges captured</p>
        
        <div className="flex flex-col gap-6">
          {exchanges.map((ex, index) => (
            <div key={index} className="bg-[#11161d] border border-border p-6 rounded-md flex flex-col gap-4">
              <h4 className="text-white font-bold">Q{index + 1}: {ex.question.text}</h4>
              <div className="text-text-mute whitespace-pre-wrap leading-relaxed">
                {ex.answer ? formatText(ex.answer.text) : <span className="italic text-gray-500">Awaiting response...</span>}
              </div>
              <div className="text-text-dim font-mono text-xs mt-2">
                {ex.timestamp}
              </div>
            </div>
          ))}
          {exchanges.length === 0 && (
            <div className="text-text-dim font-mono text-center p-12 border border-dashed border-border rounded-md">
              No diagnostic exchanges recorded yet.
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 mt-4">
        <button className="bg-accent text-background font-mono font-bold uppercase tracking-widest px-8 py-3 rounded hover:bg-accent/90 transition-colors">
          Generate PDF
        </button>
        <button className="bg-bg-elev border border-border text-text font-mono uppercase tracking-widest px-8 py-3 rounded hover:bg-bg-deep transition-colors">
          Export Session CSV
        </button>
        <button 
          onClick={() => setMessages([])} 
          className="bg-red-500 text-white font-mono font-bold uppercase tracking-widest px-8 py-3 rounded hover:bg-red-600 transition-colors ml-auto"
        >
          Clear Session
        </button>
      </div>
    </div>
  );
}
