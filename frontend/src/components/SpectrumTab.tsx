export default function SpectrumTab() {
  return (
    <div className="p-8 h-full flex flex-col items-center justify-center text-center">
      <div className="border border-border-color bg-[#111] p-12 max-w-2xl w-full rounded-sm">
        <h2 className="text-xl font-bold text-accent-gold mb-4 uppercase tracking-widest">
          Spectrum Analysis
        </h2>
        <p className="text-gray-400 mb-8 font-mono text-sm">
          Awaiting waveform data or diagnostic session completion to generate fault-frequency table.
        </p>
        <div className="h-64 border border-dashed border-border-color flex items-center justify-center">
          <span className="text-gray-600 text-sm tracking-widest uppercase">
            No active session data
          </span>
        </div>
      </div>
    </div>
  );
}
