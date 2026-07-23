import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VDX — Vibration Diagnostic Engine",
  description: "Chat-style diagnostic console for machine-reliability operators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen p-[10px] sm:p-[18px]">
        <div className="max-w-[1420px] w-full mx-auto flex flex-col flex-1">
          <header className="bg-gradient-to-b from-bg-elev to-bg-base border border-border rounded-lg py-[18px] sm:py-[18px] px-[14px] sm:px-[14px] mb-[14px] flex items-center justify-between gap-6 relative overflow-hidden shrink-0">
            {/* Header background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-soft to-transparent opacity-40 pointer-events-none"></div>

            <div className="flex items-center gap-[14px] relative z-10">
              <div className="min-h-[38px] min-w-[38px] border border-accent rounded grid place-items-center bg-bg-deep relative">
                <div className="absolute left-[7px] right-[7px] top-1/2 h-px -translate-y-[6px] bg-accent opacity-40"></div>
                <div className="absolute left-[7px] right-[7px] top-1/2 h-[2px] bg-accent"></div>
                <div className="absolute left-[7px] right-[7px] top-1/2 h-px translate-y-[6px] bg-accent opacity-40"></div>
              </div>
              <div>
                <h1 className="font-mono text-[0.95em] font-semibold tracking-[0.04em] text-text uppercase m-0 leading-tight">
                  VDX<span className="text-accent"> &middot; </span>VIBRATION DIAGNOSTIC ENGINE
                </h1>
                <p className="text-text-mute text-[0.78em] tracking-[0.08em] uppercase mt-[2px] m-0">
                  ISO 10816-7 &middot; Vibration analysis of screw compressor with anti friction bearings
                </p>
              </div>
            </div>

            <div className="flex gap-[18px] items-center relative z-10 font-mono text-[0.72em] tracking-[0.05em]">
              <div className="flex flex-col items-end">
                <span className="text-text-dim uppercase text-[0.85em]">Session</span>
                <span className="text-text font-semibold">19610139</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-text-dim uppercase text-[0.85em]">Engine</span>
                <span className="text-text font-semibold">VDX/1.0</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-text-dim uppercase text-[0.85em]">Status</span>
                <span className="inline-flex items-center gap-[7px] text-green font-semibold uppercase">
                  <span className="relative flex h-[7px] w-[7px]">
                    <span className="animate-[pulse_1.6s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-green shadow-[0_0_8px_var(--green)]"></span>
                  </span>
                  Online
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 flex flex-col relative">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
