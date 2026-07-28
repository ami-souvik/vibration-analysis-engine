import { DiagnosticResult, FaultFrequency } from "./models";
import { matchPeaks } from "./screwCompressor";

export function getIso208163Zone(machineGroup: string, foundationType: string, overallRms: number): string {
  const limits: Record<string, Record<string, number[]>> = {
    "Group 1": {
      Rigid: [2.3, 4.5, 7.1],
      Flexible: [3.5, 7.1, 11.0],
    },
    "Group 2": {
      Rigid: [1.4, 2.8, 4.5],
      Flexible: [2.3, 4.5, 7.1],
    },
  };

  const groupLimits = limits[machineGroup]?.[foundationType];
  if (!groupLimits) {
    return "Unknown Configuration";
  }

  if (overallRms <= groupLimits[0]) {
    return "Zone A (Newly commissioned)";
  } else if (overallRms <= groupLimits[1]) {
    return "Zone B (Unrestricted long-term operation)";
  } else if (overallRms <= groupLimits[2]) {
    return "Zone C (Limited operation)";
  } else {
    return "Zone D (Danger of damage)";
  }
}

export function diagnoseCentrifugalFan(params: {
  fan_rpm: number;
  vanes: number;
  foundation_type: string;
  machine_group: string;
  measured_peaks: Record<string, number>;
  overall_vibration_rms?: number | null;
}): DiagnosticResult {
  const { fan_rpm, vanes, foundation_type, machine_group, measured_peaks, overall_vibration_rms } = params;

  const shaftSpeedHz = fan_rpm / 60.0;
  const bpfHz = vanes * shaftSpeedHz;

  const freqs: FaultFrequency[] = [
    { label: "1x Shaft Speed", frequency_hz: shaftSpeedHz, description: "Impeller Unbalance" },
    { label: "2x Shaft Speed", frequency_hz: 2 * shaftSpeedHz, description: "Coupling Misalignment" },
  ];

  for (let i = 1; i <= 4; i++) {
    freqs.push({
      label: `${i}x Shaft Speed`,
      frequency_hz: i * shaftSpeedHz,
      description: "Mechanical Looseness",
    });
  }

  const stallMidpoint = ((0.66 + 0.75) / 2) * shaftSpeedHz;
  const surgeMidpoint = ((0.33 + 0.50) / 2) * shaftSpeedHz;
  freqs.push({ label: "Stall Band Midpoint", frequency_hz: stallMidpoint, description: "Aerodynamic Stall" });
  freqs.push({ label: "Surge Band Midpoint", frequency_hz: surgeMidpoint, description: "Aerodynamic Surge" });

  freqs.push({ label: "1x BPF", frequency_hz: bpfHz, description: "Blade Pass Frequency" });
  freqs.push({ label: "2x BPF", frequency_hz: 2 * bpfHz, description: "2x Blade Pass Frequency" });

  freqs.push({ label: "BPFO", frequency_hz: 7.35 * shaftSpeedHz, description: "Outer Race Defect" });
  freqs.push({ label: "BPFI", frequency_hz: 9.45 * shaftSpeedHz, description: "Inner Race Defect" });
  freqs.push({ label: "BSF", frequency_hz: 2.65 * shaftSpeedHz, description: "Roller Spin Defect" });
  freqs.push({ label: "FTF", frequency_hz: 0.42 * shaftSpeedHz, description: "Cage Speed Defect" });

  const matched = matchPeaks(freqs, measured_peaks);

  let verdict = "Unknown";
  if (overall_vibration_rms !== undefined && overall_vibration_rms !== null) {
    verdict = getIso208163Zone(machine_group, foundation_type, overall_vibration_rms);
  }

  return {
    machine_type: "Centrifugal Fan",
    calculated_frequencies: freqs,
    acceptance_verdict: verdict,
    acceptance_limit_rms: null,
    matched_faults: matched,
  };
}
