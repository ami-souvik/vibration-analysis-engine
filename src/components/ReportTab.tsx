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

  const hasSessions = exchanges.length > 0;

  const handleExportCSV = () => {
    if (!hasSessions) return;

    const csvRows = [
      ["Exchange #", "Timestamp", "Operator Question", "Engine Diagnostic Answer"]
    ];

    exchanges.forEach((ex, idx) => {
      csvRows.push([
        `Q${idx + 1}`,
        ex.timestamp,
        `"${ex.question.text.replace(/"/g, '""')}"`,
        `"${(ex.answer ? ex.answer.text : "Awaiting response...").replace(/"/g, '""')}"`
      ]);
    });

    const csvString = csvRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vdx_diagnostic_session_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGeneratePDF = async () => {
    if (!hasSessions) return;

    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    const margin = 15;
    let y = 20;

    // Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("VDX - VIBRATION DIAGNOSTIC ENGINE", margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Session Diagnostic Report - Screw Compressor Analysis", margin, y);
    y += 5;
    doc.text(`Generated: ${new Date().toLocaleString()} | Total Exchanges: ${exchanges.length}`, margin, y);
    y += 8;

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, 195, y);
    y += 10;

    // Exchanges
    exchanges.forEach((ex, idx) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(240, 180, 41);
      const qText = `Q${idx + 1}: ${ex.question.text}`;
      const splitQ = doc.splitTextToSize(qText, 180);
      doc.text(splitQ, margin, y);
      y += splitQ.length * 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Time: ${ex.timestamp}`, margin, y);
      y += 6;

      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const ansRaw = ex.answer ? ex.answer.text.replace(/\*\*/g, "") : "Awaiting response...";
      const splitAns = doc.splitTextToSize(ansRaw, 180);

      for (let i = 0; i < splitAns.length; i++) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(splitAns[i], margin, y);
        y += 5;
      }

      y += 6;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, 195, y);
      y += 8;
    });

    doc.save(`vdx_diagnostic_report_${Date.now()}.pdf`);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-base p-4 md:p-7 flex flex-col gap-8 text-sm">
      <div className="flex flex-col">
        <h3 className="text-text-mute font-mono tracking-widest uppercase pb-2 mb-4 text-display-xs border-b border-b-border before:content-['//_'] before:text-accent">Session Diagnostic Report</h3>
        <p className="text-text-mute text-sm mb-4">{exchanges.length} diagnostic exchanges captured</p>

        <div className="flex flex-col gap-6">
          {exchanges.map((ex, index) => (
            <div key={index} className="bg-[#11161d] border border-l-4 border-border border-l-accent px-4 py-3 rounded-md flex flex-col gap-4">
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

      <div className="flex flex-wrap gap-4 mt-4">
        <button
          onClick={handleGeneratePDF}
          disabled={!hasSessions}
          className={`text-[0.78em] font-mono uppercase tracking-widest px-4 py-2 rounded-md transition-all ${
            hasSessions
              ? "bg-accent text-black font-bold hover:bg-accent/90 cursor-pointer"
              : "bg-bg-elev border border-border/40 text-text-dim/50 cursor-not-allowed opacity-40"
          }`}
        >
          Generate PDF
        </button>
        <button
          onClick={handleExportCSV}
          disabled={!hasSessions}
          className={`text-[0.78em] font-mono uppercase tracking-widest px-4 py-2 rounded-md transition-all ${
            hasSessions
              ? "bg-bg-elev border border-border text-text hover:bg-bg-deep cursor-pointer"
              : "bg-bg-elev border border-border/40 text-text-dim/50 cursor-not-allowed opacity-40"
          }`}
        >
          Export Session CSV
        </button>
        <button
          onClick={() => setMessages([])}
          disabled={!hasSessions}
          className={`text-[0.78em] font-mono uppercase tracking-widest px-4 py-2 rounded-md transition-all ${
            hasSessions
              ? "bg-red-500 text-white font-bold hover:bg-red-600 cursor-pointer"
              : "bg-bg-elev border border-border/40 text-text-dim/50 cursor-not-allowed opacity-40"
          }`}
        >
          Clear Session
        </button>
      </div>
    </div>
  );
}
