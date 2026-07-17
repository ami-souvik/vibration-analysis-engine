"use client";

import { useState } from "react";
import ChatTab from "@/components/ChatTab";
import SpectrumTab from "@/components/SpectrumTab";
import ReportTab from "@/components/ReportTab";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"diagnosis" | "spectrum" | "report">("diagnosis");

  return (
    <div className="flex flex-col h-full flex-1">
      <div className="border-b border-border-color bg-background/50 flex">
        <button
          onClick={() => setActiveTab("diagnosis")}
          className={`px-6 py-3 font-semibold uppercase text-sm border-b-2 transition-colors ${activeTab === "diagnosis"
              ? "border-accent-gold text-accent-gold"
              : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
        >
          Diagnosis
        </button>
        <button
          onClick={() => setActiveTab("spectrum")}
          className={`px-6 py-3 font-semibold uppercase text-sm border-b-2 transition-colors ${activeTab === "spectrum"
              ? "border-accent-gold text-accent-gold"
              : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
        >
          Spectrum Analysis
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`px-6 py-3 font-semibold uppercase text-sm border-b-2 transition-colors ${activeTab === "report"
              ? "border-accent-gold text-accent-gold"
              : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
        >
          Report
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === "diagnosis" && <ChatTab />}
        {activeTab === "spectrum" && <SpectrumTab />}
        {activeTab === "report" && <ReportTab />}
      </div>
    </div>
  );
}
