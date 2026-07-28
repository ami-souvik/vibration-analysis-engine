"use client";

import { useState } from "react";
import ChatTab, { Message } from "@/components/ChatTab";
import SpectrumTab from "@/components/SpectrumTab";
import ReportTab from "@/components/ReportTab";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"diagnosis" | "spectrum" | "report">("diagnosis");
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <div className="flex flex-col h-full flex-1">
      <div className="bg-bg-elev border border-border rounded-t-lg flex p-2 gap-2">
        <button
          onClick={() => setActiveTab("diagnosis")}
          className={`px-4 py-2 font-mono font-semibold uppercase text-[0.75em] tracking-widest transition-colors flex items-center gap-2 rounded-md ${activeTab === "diagnosis" ? "bg-bg-deep text-text" : "text-text-dim hover:text-text-mute"
            }`}
        >
          <span className={`size-1.5 rounded-full ${activeTab === "diagnosis" ? "bg-accent" : "bg-text-dim"}`}></span>
          Diagnosis
        </button>
        <button
          onClick={() => setActiveTab("spectrum")}
          className={`px-4 py-2 font-mono font-semibold uppercase text-[0.75em] tracking-widest transition-colors flex items-center gap-2 rounded-md ${activeTab === "spectrum" ? "bg-bg-deep text-text" : "text-text-dim hover:text-text-mute"
            }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "spectrum" ? "bg-accent" : "bg-text-dim"}`}></span>
          Spectrum Analysis
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`px-4 py-2 font-mono font-semibold uppercase text-[0.75em] tracking-widest transition-colors flex items-center gap-2 rounded-md ${activeTab === "report" ? "bg-bg-deep text-text" : "text-text-dim hover:text-text-mute"
            }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "report" ? "bg-accent" : "bg-text-dim"}`}></span>
          Report
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative border border-border border-t-0 rounded-b-lg">
        {activeTab === "diagnosis" && <ChatTab messages={messages} setMessages={setMessages} />}
        {activeTab === "spectrum" && <SpectrumTab />}
        {activeTab === "report" && <ReportTab messages={messages} setMessages={setMessages} />}
      </div>
    </div>
  );
}
