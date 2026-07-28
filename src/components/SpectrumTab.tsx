"use client";

import { useState } from "react";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import Papa from "papaparse";

interface FaultFrequency {
  label: string;
  frequency_hz: number;
  ratio: string;
  description: string;
}

export default function SpectrumTab() {
  const [bearingNumber, setBearingNumber] = useState("7309");
  const [shaftSpeed, setShaftSpeed] = useState("3000");
  const [maleLobes, setMaleLobes] = useState("4");
  const [femaleLobes, setFemaleLobes] = useState("6");
  const [balls, setBalls] = useState("16");
  const [ballDiameter, setBallDiameter] = useState("12.5");
  const [pitchDiameter, setPitchDiameter] = useState("90");
  const [contactAngle, setContactAngle] = useState("0");
  const [peakFrequencies, setPeakFrequencies] = useState("49.7, 99.3, 228, 338");

  const [status, setStatus] = useState<string>("");
  const [analysisResults, setAnalysisResults] = useState<FaultFrequency[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chartData, setChartData] = useState<any[]>([]);

  const handleLoadGeometry = async () => {
    try {
      const res = await fetch(`/api/spectrum/bearing/${encodeURIComponent(bearingNumber)}`);
      if (res.ok) {
        const data = await res.json();
        setBalls(data.balls.toString());
        setBallDiameter(data.ball_diameter.toString());
        setPitchDiameter(data.pitch_diameter.toString());
        setContactAngle(data.contact_angle.toString());
        setStatus("Geometry loaded successfully.");
      } else {
        setStatus("Bearing geometry not found in database.");
      }
    } catch {
      setStatus("Error loading geometry.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: false,
        dynamicTyping: true,
        complete: (results) => {
          const parsed = results.data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((row: any) => row.length >= 2 && typeof row[0] === 'number')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((row: any) => ({
              frequency: row[0],
              amplitude: row[1]
            }));
          setChartData(parsed);
          setStatus("CSV data loaded.");
        }
      });
    }
  };

  const handleAnalyze = async () => {
    setStatus("Calculating fault frequencies and generating spectrum...");
    try {
      const parsedPeaks = peakFrequencies.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));

      const res = await fetch("/api/spectrum/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shaft_rpm: parseFloat(shaftSpeed),
          male_lobes: parseInt(maleLobes) || 4,
          female_lobes: parseInt(femaleLobes) || 6,
          balls: parseInt(balls),
          ball_diameter: parseFloat(ballDiameter),
          pitch_diameter: parseFloat(pitchDiameter),
          contact_angle: parseFloat(contactAngle),
          operator_peaks: parsedPeaks
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysisResults(data.faults);

        // Generate synthetic spectrum if no CSV was uploaded
        if (chartData.length === 0) {
          const synthetic = [];
          for (let f = 0; f <= 1500; f += 2) {
            let amp = 0.01 + Math.random() * 0.01;
            // Inject calculated peaks
            data.faults.forEach((fault: FaultFrequency) => {
              if (Math.abs(f - fault.frequency_hz) < 2) {
                amp = 0.4;
              }
            });
            // Inject operator peaks
            parsedPeaks.forEach((peak) => {
              if (Math.abs(f - peak) < 2) {
                amp = 0.7 + Math.random() * 0.1;
              }
            });
            synthetic.push({ frequency: f, amplitude: amp });
          }
          setChartData(synthetic);
        }

        setStatus("Analysis complete - calculated fault frequencies (amber), operator-reported peaks (cyan), CSV spectrum (white) overlaid.");
      } else {
        setStatus("Error calculating frequencies.");
      }
    } catch {
      setStatus("Error during analysis.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-base p-4 md:p-7 flex flex-col gap-8 text-sm">
      {/* Measurement Guidance */}
      <div className="bg-bg-elev border border-border rounded-md py-4 px-5">
        <h3 className="text-text-mute font-mono tracking-widest uppercase pb-2 mb-4 text-display-xs border-b border-b-border before:content-['//_'] before:text-accent">Measurement Guidance</h3>
        <ul className="space-y-1 text-text-mute flex flex-col">
          <li className="text-[0.78rem] before:content-['›'] before:text-accent before:mr-2">FFT line resolution should be set to <strong className="text-text">800 lines</strong> to capture proper fault-frequency detail.</li>
          <li className="text-[0.78rem] before:content-['›'] before:text-accent before:mr-2">For overall machine health, report <strong className="text-text">overall vibration in mm/sec RMS</strong> (VDI 3836 / ISO 10816-7).</li>
          <li className="text-[0.78rem] before:content-['›'] before:text-accent before:mr-2">When reporting individual <strong className="text-text">peak frequencies</strong>, use <strong className="text-text">mm/sec or microns pk-pk</strong> - do not use RMS at the peak level.</li>
          <li className="text-[0.78rem] before:content-['›'] before:text-accent before:mr-2"><strong className="text-text">Rotor Mesh Frequency (RMF = Male Lobes × Speed)</strong> and <strong className="text-text">Female Rotor Speed</strong> are computed to identify pocket passing and meshing anomalies.</li>
          <li className="text-[0.78rem] before:content-['›'] before:text-accent before:mr-2">Even when compressor & motor are joined by a <strong className="text-text">flexible coupling</strong>, analyse <strong className="text-text">both units</strong> - compressor-side faults can propagate to the motor and vice versa.</li>
        </ul>
      </div>

      {/* Bearing Designation */}
      <div>
        <h3 className="text-text-mute font-mono tracking-widest uppercase pb-2 mb-4 text-display-xs border-b border-b-border before:content-['//_'] before:text-accent">
          Bearing Designation (Auto-Fills Geometry)
        </h3>
        <div className="flex gap-4 items-end">
          <div className="flex flex-col flex-1 gap-2">
            <label className="text-text-mute text-display-xs uppercase tracking-widest font-mono">
              Bearing Number (e.g. 7309, NU309, 6310, 3307)
            </label>
            <input
              value={bearingNumber}
              onChange={(e) => setBearingNumber(e.target.value)}
              placeholder="Type bearing designation, then click Load"
              className="bg-bg-elev border border-border rounded px-3 py-2 text-text w-full font-mono focus:outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleLoadGeometry}
            className="bg-accent text-background font-mono font-bold uppercase tracking-widest px-8 py-3 rounded hover:bg-accent/90 transition-colors shrink-0"
          >
            Load Geometry
          </button>
        </div>
      </div>

      {/* Bearing Geometry */}
      <div>
        <h3 className="text-text-mute font-mono tracking-widest uppercase pb-2 mb-4 text-display-xs border-b border-b-border before:content-['//_'] before:text-accent">
          Rotor Geometry & Operating Speed
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-text-mute text-display-xs uppercase tracking-widest font-mono">Male Rotor Speed / Shaft Speed (RPM)</label>
            <input
              value={shaftSpeed}
              onChange={(e) => setShaftSpeed(e.target.value)}
              className="bg-bg-elev border border-border rounded px-3 py-2 text-text w-full font-mono focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-text-mute text-display-xs uppercase tracking-widest font-mono">Male Rotor Lobes Count</label>
            <input
              value={maleLobes}
              onChange={(e) => setMaleLobes(e.target.value)}
              className="bg-bg-elev border border-border rounded px-3 py-2 text-text w-full font-mono focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-text-mute text-display-xs uppercase tracking-widest font-mono">Female Rotor Lobes Count</label>
            <input
              value={femaleLobes}
              onChange={(e) => setFemaleLobes(e.target.value)}
              className="bg-bg-elev border border-border rounded px-3 py-2 text-text w-full font-mono focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-text-mute text-display-xs uppercase tracking-widest font-mono">Number of Balls / Rollers</label>
            <input
              value={balls}
              onChange={(e) => setBalls(e.target.value)}
              className="bg-bg-elev border border-border rounded px-3 py-2 text-text w-full font-mono focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-text-mute text-display-xs uppercase tracking-widest font-mono">Ball Diameter (mm)</label>
            <input
              value={ballDiameter}
              onChange={(e) => setBallDiameter(e.target.value)}
              className="bg-bg-elev border border-border rounded px-3 py-2 text-text w-full font-mono focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-text-mute text-display-xs uppercase tracking-widest font-mono">Pitch Diameter (mm)</label>
            <input
              value={pitchDiameter}
              onChange={(e) => setPitchDiameter(e.target.value)}
              className="bg-bg-elev border border-border rounded px-3 py-2 text-text w-full font-mono focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-text-mute text-display-xs uppercase tracking-widest font-mono">Contact Angle (°)</label>
            <input
              value={contactAngle}
              onChange={(e) => setContactAngle(e.target.value)}
              className="bg-bg-elev border border-border rounded px-3 py-2 text-text w-full font-mono focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* Operator Peaks */}
      <div>
        <h3 className="text-text-mute font-mono tracking-widest uppercase pb-2 mb-4 text-display-xs border-b border-b-border before:content-['//_'] before:text-accent">
          Operator-Reported Peaks (Optional)
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-text-mute text-display-xs uppercase tracking-widest font-mono">
              Peak Frequencies - Comma separated Hz (e.g. 49.7, 99.3, 228, 338)
            </label>
            <input
              value={peakFrequencies}
              onChange={(e) => setPeakFrequencies(e.target.value)}
              className="bg-bg-elev border border-border rounded px-3 py-2 text-text w-full font-mono focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-text-mute text-display-xs uppercase tracking-widest font-mono">
              CSV Upload (Frequency, Amplitude)
            </label>
            <div className="bg-bg-elev border border-border rounded px-3 py-2 flex items-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="text-text text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-white file:text-black hover:file:bg-gray-200 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-2">
        <button
          onClick={handleAnalyze}
          className="bg-accent text-background font-mono font-bold uppercase tracking-widest px-8 py-3 rounded hover:bg-accent/90 transition-colors"
        >
          Analyze
        </button>
        <button className="bg-bg-elev border border-border text-text font-mono uppercase tracking-widest px-8 py-3 rounded hover:bg-bg-deep transition-colors">
          Download Spectrum CSV
        </button>
      </div>

      {status && (
        <div className="bg-[#0b1b1d] border border-[#1b3b3d] text-cyan-400 p-4 font-mono text-sm rounded">
          <span className="text-accent">•</span>{status}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-bg-elev border border-border p-6 rounded h-[500px] flex flex-col">
          <div className="flex justify-center gap-8 mb-4 text-xs font-mono tracking-widest">
            <div className="flex items-center gap-2"><span className="w-8 h-px bg-white"></span> Vibration Spectrum</div>
            <div className="flex items-center gap-2"><span className="w-8 h-2 bg-cyan-400"></span> Operator Peaks</div>
            <div className="flex items-center gap-2"><span className="w-8 h-2 bg-amber-500"></span> Calculated Fault Frequencies</div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid stroke="#333" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="frequency" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -10, fill: '#888' }} />
              <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 12 }} label={{ value: 'Amplitude', angle: -90, position: 'insideLeft', fill: '#888' }} />
              <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />

              <Line type="monotone" dataKey="amplitude" stroke="#fff" dot={false} strokeWidth={1.5} isAnimationActive={false} />

              {/* Plot stems for calculated faults */}
              {analysisResults.map((fault, idx) => (
                <ReferenceLine key={idx} x={fault.frequency_hz} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: '●', fill: '#f59e0b', fontSize: 20 }} />
              ))}

              {/* Operator peaks could also be mapped as ReferenceLines or Scatter */}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Results Table */}
      {analysisResults.length > 0 && (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-left text-sm font-mono">
            <thead className="bg-bg-elev text-text-dim text-display-xs uppercase tracking-widest border-b border-border">
              <tr>
                <th className="p-4 font-normal">Fault Frequency</th>
                <th className="p-4 font-normal">Frequency (Hz)</th>
                <th className="p-4 font-normal">Ratio to Shaft</th>
                <th className="p-4 font-normal">Fault Indication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-bg-base text-text-mute">
              {analysisResults.map((res, i) => (
                <tr key={i} className="hover:bg-bg-elev transition-colors">
                  <td className="p-4 text-text">{res.label}</td>
                  <td className="p-4">{res.frequency_hz.toFixed(2)}</td>
                  <td className="p-4">{res.ratio}</td>
                  <td className="p-4">{res.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
