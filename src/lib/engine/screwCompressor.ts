import { DiagnosticResult, FaultFrequency, MatchedPeak } from "./models";
import { calculateSpectrumFaults, getOrEstimateBearingGeometry } from "./spectrum";

export function matchPeaks(
  calculatedFreqs: FaultFrequency[],
  measuredPeaks: Record<string, number>,
  tolerancePct: number = 3.5
): MatchedPeak[] {
  const matched: MatchedPeak[] = [];

  for (const [, peakHz] of Object.entries(measuredPeaks)) {
    for (const calc of calculatedFreqs) {
      const tolerance = Math.max(0.5, calc.frequency_hz * (tolerancePct / 100.0));
      const diff = Math.abs(peakHz - calc.frequency_hz);
      if (diff <= tolerance) {
        const confidence = Math.max(0.0, 100.0 * (1 - diff / tolerance));
        matched.push({
          measured_frequency_hz: peakHz,
          calculated_frequency_hz: calc.frequency_hz,
          fault_condition: calc.description,
          confidence: Number(confidence.toFixed(1)),
        });
      }
    }
  }

  return matched;
}

export function getVdi3836Limit(machineGroup: string, foundationType: string): number | null {
  const groupKey = machineGroup ? machineGroup.split("(")[0].trim() : "";
  const limits: Record<string, Record<string, number>> = {
    "Group 1": { Rigid: 2.0, Flexible: 3.0 },
    "Group 2": { Rigid: 3.0, Flexible: 5.0 },
    "Group 3": { Rigid: 3.0, Flexible: 4.5 },
  };

  if (limits[groupKey] && limits[groupKey][foundationType] !== undefined) {
    return limits[groupKey][foundationType];
  }
  return 3.0;
}

export function getBearingFaults(motorRpm: number, bearingNumbers: string[]): FaultFrequency[] {
  const freqs: FaultFrequency[] = [];
  for (const bearing of bearingNumbers) {
    const geom = getOrEstimateBearingGeometry(bearing);
    const results = calculateSpectrumFaults({
      shaft_rpm: motorRpm,
      balls: geom.balls,
      ball_diameter: geom.ball_diameter,
      pitch_diameter: geom.pitch_diameter,
      contact_angle: geom.contact_angle,
    });

    for (const res of results) {
      if (!res.label.includes("Shaft")) {
        const code = res.label.split(" - ")[0];
        freqs.push({
          label: `${code} (${bearing})`,
          frequency_hz: res.frequency_hz,
          description: res.description,
        });
      }
    }
  }
  return freqs;
}

export function diagnoseScrewCompressor(params: {
  motor_rpm: number;
  male_lobes: number;
  female_lobes: number;
  foundation_type: string;
  machine_group: string;
  measured_peaks: Record<string, number>;
  overall_vibration_rms?: number | null;
  bearing_numbers?: string[] | null;
}): DiagnosticResult {
  const {
    motor_rpm,
    male_lobes,
    female_lobes,
    foundation_type,
    machine_group,
    measured_peaks,
    overall_vibration_rms,
    bearing_numbers,
  } = params;

  const maleSpeedHz = motor_rpm / 60.0;
  const femaleSpeedHz = female_lobes ? (motor_rpm * (male_lobes / female_lobes)) / 60.0 : maleSpeedHz;
  const rmfHz = male_lobes * maleSpeedHz;

  const freqs: FaultFrequency[] = [
    { label: "1x Male Speed", frequency_hz: maleSpeedHz, description: "Male Rotor Unbalance / Misalignment" },
    { label: "2x Male Speed", frequency_hz: 2 * maleSpeedHz, description: "Misalignment" },
    { label: "1x Female Speed", frequency_hz: femaleSpeedHz, description: "Female Rotor Unbalance" },
    { label: "RMF", frequency_hz: rmfHz, description: "Normal Gas Pulsation" },
    { label: "2x RMF", frequency_hz: 2 * rmfHz, description: "Rotor-to-Rotor Contact" },
    { label: "Casing Distortion", frequency_hz: maleSpeedHz + rmfHz, description: "Casing Distortion" },
  ];

  for (let i = 1; i <= 10; i++) {
    freqs.push({
      label: `${i}x Male Speed`,
      frequency_hz: i * maleSpeedHz,
      description: "Mechanical Looseness",
    });
  }

  if (bearing_numbers && bearing_numbers.length > 0) {
    freqs.push(...getBearingFaults(motor_rpm, bearing_numbers));
  }

  const matched = matchPeaks(freqs, measured_peaks);

  const matchedFreqs = matched.map((m) => m.measured_frequency_hz);
  for (const [, peakHz] of Object.entries(measured_peaks)) {
    if (!matchedFreqs.includes(peakHz)) {
      if (peakHz > 3 * rmfHz) {
        matched.push({
          measured_frequency_hz: peakHz,
          calculated_frequency_hz: peakHz,
          fault_condition: "Potential High-Frequency Bearing Defect (Non-Synchronous)",
          confidence: 70.0,
        });
      }
    }
  }

  const limit = getVdi3836Limit(machine_group, foundation_type);

  let verdict = "Unknown";
  if (limit !== null && overall_vibration_rms !== undefined && overall_vibration_rms !== null) {
    if (overall_vibration_rms <= limit) {
      verdict = "Pass";
    } else {
      verdict = "Fail";
    }
  } else if (overall_vibration_rms === undefined || overall_vibration_rms === null) {
    verdict = "No overall vibration provided";
  }

  return {
    machine_type: "Screw Compressor",
    calculated_frequencies: freqs,
    acceptance_verdict: verdict,
    acceptance_limit_rms: limit,
    matched_faults: matched,
  };
}
