import { Download } from "lucide-react";

export default function ReportTab() {
  return (
    <div className="p-8 h-full flex flex-col items-center overflow-y-auto">
      <div className="border border-border-color bg-white text-black p-12 max-w-4xl w-full font-serif shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-accent-gold"></div>
        <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">VIBRATION DIAGNOSTIC REPORT</h1>
            <p className="text-sm text-gray-600 mt-2 font-mono">SESSION ID: 0x9A2F | DATE: {new Date().toISOString().split('T')[0]}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">VDX Engine v1.0</p>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="font-bold text-lg mb-2 uppercase border-b border-gray-300">1. Machine Parameters</h3>
            <p className="text-gray-500 italic">No parameters loaded.</p>
          </section>
          
          <section>
            <h3 className="font-bold text-lg mb-2 uppercase border-b border-gray-300">2. Calculated Frequencies</h3>
            <p className="text-gray-500 italic">No frequency table generated.</p>
          </section>

          <section>
            <h3 className="font-bold text-lg mb-2 uppercase border-b border-gray-300">3. Diagnostic Verdict</h3>
            <p className="text-gray-500 italic">Awaiting completion of diagnostic chat.</p>
          </section>
        </div>
      </div>
      
      <div className="mt-8">
        <button className="bg-accent-gold hover:bg-yellow-400 text-black px-6 py-3 font-bold flex items-center gap-2 transition-colors uppercase tracking-wider rounded-sm">
          <Download size={18} />
          Export PDF
        </button>
      </div>
    </div>
  );
}
