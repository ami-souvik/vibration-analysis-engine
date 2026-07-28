import { DiagnosticResult, FaultFrequency, MatchedPeak } from "./models";
import { getOrEstimateBearingGeometry, calculateSpectrumFaults } from "./spectrum";

export interface IsoZoneResult {
  zone: string;
  verdict: string;
  limit: number;
  description: string;
}

export function getIso208163Evaluation(
  machineGroup: string,
  foundationType: string,
  overallRms: number
): IsoZoneResult {
  const normGroup = machineGroup.includes("Group 1") || machineGroup.includes("Large") ? "Group 1" : "Group 2";
  const normFoundation = foundationType.toLowerCase().includes("flex") ? "Flexible" : "Rigid";

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

  const thresholds = limits[normGroup]?.[normFoundation] || [2.3, 4.5, 7.1];

  if (overallRms <= thresholds[0]) {
    return {
      zone: "Zone A",
      verdict: "Good (Newly commissioned / Normal)",
      limit: thresholds[0],
      description: `Overall vibration ${overallRms} mm/s RMS is in Zone A (<= ${thresholds[0]} mm/s RMS). Machine is in good condition.`,
    };
  } else if (overallRms <= thresholds[1]) {
    return {
      zone: "Zone B",
      verdict: "Acceptable (Unrestricted long-term operation)",
      limit: thresholds[1],
      description: `Overall vibration ${overallRms} mm/s RMS is in Zone B (${thresholds[0]} - ${thresholds[1]} mm/s RMS). Acceptable for unrestricted long-term operation.`,
    };
  } else if (overallRms <= thresholds[2]) {
    return {
      zone: "Zone C",
      verdict: "Limited Operation (Action Recommended)",
      limit: thresholds[2],
      description: `Overall vibration ${overallRms} mm/s RMS is in Zone C (${thresholds[1]} - ${thresholds[2]} mm/s RMS). Unsatisfactory for continuous operation; corrective action required soon.`,
    };
  } else {
    return {
      zone: "Zone D",
      verdict: "Dangerous (High Risk of Damage)",
      limit: thresholds[2],
      description: `Overall vibration ${overallRms} mm/s RMS is in Zone D (> ${thresholds[2]} mm/s RMS). Vibration level is dangerous; shut down or inspect immediately.`,
    };
  }
}

export function diagnoseCentrifugalFan(params: {
  fan_rpm: number;
  vanes: number;
  foundation_type: string;
  machine_group: string;
  measured_peaks: Record<string, number>;
  overall_vibration_rms?: number | null;
  bearing_numbers?: string[] | null;
}): DiagnosticResult {
  const {
    fan_rpm,
    vanes,
    foundation_type,
    machine_group,
    measured_peaks,
    overall_vibration_rms,
    bearing_numbers,
  } = params;

  const shaftSpeedHz = fan_rpm / 60.0;
  const shaftSpeedCpm = fan_rpm;

  const twoXHz = 2 * shaftSpeedHz;
  const bpfHz = vanes * shaftSpeedHz;
  const twoBpfHz = 2 * bpfHz;

  const stallLowHz = 0.66 * shaftSpeedHz;
  const stallHighHz = 0.75 * shaftSpeedHz;

  const surgeLowHz = 0.33 * shaftSpeedHz;
  const surgeHighHz = 0.50 * shaftSpeedHz;

  const freqs: FaultFrequency[] = [
    {
      label: "1x Shaft Speed",
      frequency_hz: Number(shaftSpeedHz.toFixed(2)),
      frequency_cpm: Math.round(shaftSpeedCpm),
      description: "Impeller Unbalance / Buildup",
      directional_trait: "Purely Radial",
      dominant_location: "Low Frequency",
    },
    {
      label: "2x Shaft Speed",
      frequency_hz: Number(twoXHz.toFixed(2)),
      frequency_cpm: Math.round(2 * shaftSpeedCpm),
      description: "Coupling Misalignment / Bent Shaft",
      directional_trait: "Strongly Axial",
      dominant_location: "Low Frequency",
    },
    {
      label: "Aerodynamic Stall Range",
      frequency_hz: Number(((stallLowHz + stallHighHz) / 2).toFixed(2)),
      frequency_cpm: Math.round(((stallLowHz + stallHighHz) / 2) * 60),
      description: `Aerodynamic Stall (Blade Flow Separation, ${stallLowHz.toFixed(2)} - ${stallHighHz.toFixed(2)} Hz)`,
      directional_trait: "Fluctuating Radial",
      dominant_location: "Subsynchronous (66% to 75% of 1x)",
    },
    {
      label: "Aerodynamic Surge Range",
      frequency_hz: Number(((surgeLowHz + surgeHighHz) / 2).toFixed(2)),
      frequency_cpm: Math.round(((surgeLowHz + surgeHighHz) / 2) * 60),
      description: `Aerodynamic Surge (System Flow Reversal, ${surgeLowHz.toFixed(2)} - ${surgeHighHz.toFixed(2)} Hz)`,
      directional_trait: "Severe Axial/Radial",
      dominant_location: "Subsynchronous / Low-frequency (33% to 50% of 1x)",
    },
    {
      label: "1x Blade Pass Frequency (BPF)",
      frequency_hz: Number(bpfHz.toFixed(2)),
      frequency_cpm: Math.round(bpfHz * 60),
      description: "Flow Obstruction / Inlet Cone Misalignment / BPF Anomaly",
      directional_trait: "Radial & Axial",
      dominant_location: "Mid-to-High Frequency",
    },
    {
      label: "2x Blade Pass Frequency (2x BPF)",
      frequency_hz: Number(twoBpfHz.toFixed(2)),
      frequency_cpm: Math.round(twoBpfHz * 60),
      description: "Harmonic Blade Pass Anomaly",
      directional_trait: "Radial & Axial",
      dominant_location: "High Frequency",
    },
  ];

  // Harmonics 3x and 4x for Mechanical Looseness
  for (let i = 3; i <= 4; i++) {
    freqs.push({
      label: `${i}x Shaft Speed`,
      frequency_hz: Number((i * shaftSpeedHz).toFixed(2)),
      frequency_cpm: Math.round(i * shaftSpeedCpm),
      description: "Mechanical Looseness",
      directional_trait: "Radial (vertical)",
      dominant_location: "Harmonics",
    });
  }

  // Bearing Fault Frequencies
  const bpfoLowHz = 6.2 * shaftSpeedHz;
  const bpfoHighHz = 8.5 * shaftSpeedHz;
  const bpfiLowHz = 8.1 * shaftSpeedHz;
  const bpfiHighHz = 10.8 * shaftSpeedHz;
  const bsfLowHz = 2.2 * shaftSpeedHz;
  const bsfHighHz = 3.1 * shaftSpeedHz;
  const ftfLowHz = 0.40 * shaftSpeedHz;
  const ftfHighHz = 0.44 * shaftSpeedHz;

  freqs.push({
    label: "BPFO (Outer Race Defect Band)",
    frequency_hz: Number(((bpfoLowHz + bpfoHighHz) / 2).toFixed(2)),
    frequency_cpm: Math.round(((bpfoLowHz + bpfoHighHz) / 2) * 60),
    description: `Bearing Outer Race Defect (~6.2x to 8.5x 1x, ${bpfoLowHz.toFixed(1)} - ${bpfoHighHz.toFixed(1)} Hz)`,
    directional_trait: "Radial",
    dominant_location: "High Frequency (Non-Synchronous)",
  });

  freqs.push({
    label: "BPFI (Inner Race Defect Band)",
    frequency_hz: Number(((bpfiLowHz + bpfiHighHz) / 2).toFixed(2)),
    frequency_cpm: Math.round(((bpfiLowHz + bpfiHighHz) / 2) * 60),
    description: `Bearing Inner Race Defect (~8.1x to 10.8x 1x, ${bpfiLowHz.toFixed(1)} - ${bpfiHighHz.toFixed(1)} Hz)`,
    directional_trait: "Radial",
    dominant_location: "High Frequency (Non-Synchronous)",
  });

  freqs.push({
    label: "BSF (Roller Spin Defect Band)",
    frequency_hz: Number(((bsfLowHz + bsfHighHz) / 2).toFixed(2)),
    frequency_cpm: Math.round(((bsfLowHz + bsfHighHz) / 2) * 60),
    description: `Bearing Roller Spin Defect (~2.2x to 3.1x 1x, ${bsfLowHz.toFixed(1)} - ${bsfHighHz.toFixed(1)} Hz)`,
    directional_trait: "Radial",
    dominant_location: "Mid-Frequency",
  });

  freqs.push({
    label: "FTF (Cage Speed Defect Band)",
    frequency_hz: Number(((ftfLowHz + ftfHighHz) / 2).toFixed(2)),
    frequency_cpm: Math.round(((ftfLowHz + ftfHighHz) / 2) * 60),
    description: `Bearing Cage Speed Defect (~0.40x to 0.44x 1x, ${ftfLowHz.toFixed(1)} - ${ftfHighHz.toFixed(1)} Hz)`,
    directional_trait: "Radial",
    dominant_location: "Subsynchronous",
  });

  // Include bearing specific lookup if bearing_numbers provided
  if (bearing_numbers && bearing_numbers.length > 0) {
    for (const bearing of bearing_numbers) {
      const geom = getOrEstimateBearingGeometry(bearing);
      const specFaults = calculateSpectrumFaults({
        shaft_rpm: fan_rpm,
        balls: geom.balls,
        ball_diameter: geom.ball_diameter,
        pitch_diameter: geom.pitch_diameter,
        contact_angle: geom.contact_angle,
      });

      for (const sf of specFaults) {
        if (!sf.label.includes("Speed") && !sf.label.includes("RMF")) {
          freqs.push({
            label: `${sf.label.split(" - ")[0]} (${bearing})`,
            frequency_hz: sf.frequency_hz,
            frequency_cpm: sf.frequency_cpm || Math.round(sf.frequency_hz * 60),
            description: sf.description,
            directional_trait: "Radial",
            dominant_location: "High Frequency",
          });
        }
      }
    }
  }

  // Peak Matching Algorithm
  const matched: MatchedPeak[] = [];

  for (const [, peakHz] of Object.entries(measured_peaks)) {
    let bestMatch: MatchedPeak | null = null;
    let maxConfidence = 0;

    // 1. Check exact discrete calculated frequencies
    for (const calc of freqs) {
      const tol = Math.max(0.5, calc.frequency_hz * 0.035);
      const diff = Math.abs(peakHz - calc.frequency_hz);
      if (diff <= tol) {
        const conf = Math.max(0.0, 100.0 * (1 - diff / tol));
        if (conf > maxConfidence) {
          maxConfidence = conf;
          bestMatch = {
            measured_frequency_hz: peakHz,
            calculated_frequency_hz: calc.frequency_hz,
            fault_condition: calc.description,
            confidence: Number(conf.toFixed(1)),
            directional_trait: calc.directional_trait,
          };
        }
      }
    }

    // 2. Check Aerodynamic Stall Band (0.66x - 0.75x 1x)
    if (peakHz >= stallLowHz - 0.5 && peakHz <= stallHighHz + 0.5) {
      const conf = 95.0;
      if (conf > maxConfidence) {
        maxConfidence = conf;
        bestMatch = {
          measured_frequency_hz: peakHz,
          calculated_frequency_hz: Number(((stallLowHz + stallHighHz) / 2).toFixed(2)),
          fault_condition: "Aerodynamic Stall (Blade Flow Separation)",
          confidence: conf,
          directional_trait: "Fluctuating Radial",
        };
      }
    }

    // 3. Check Aerodynamic Surge Band (0.33x - 0.50x 1x)
    if (peakHz >= surgeLowHz - 0.5 && peakHz <= surgeHighHz + 0.5) {
      const conf = 95.0;
      if (conf > maxConfidence) {
        maxConfidence = conf;
        bestMatch = {
          measured_frequency_hz: peakHz,
          calculated_frequency_hz: Number(((surgeLowHz + surgeHighHz) / 2).toFixed(2)),
          fault_condition: "Aerodynamic Surge (System Flow Reversal)",
          confidence: conf,
          directional_trait: "Severe Axial/Radial",
        };
      }
    }

    // 4. Check BPFO Band (6.2x - 8.5x 1x)
    if (peakHz >= bpfoLowHz - 1.0 && peakHz <= bpfoHighHz + 1.0) {
      const conf = 90.0;
      if (conf > maxConfidence) {
        maxConfidence = conf;
        bestMatch = {
          measured_frequency_hz: peakHz,
          calculated_frequency_hz: Number(((bpfoLowHz + bpfoHighHz) / 2).toFixed(2)),
          fault_condition: "Bearing Outer Race Defect (BPFO)",
          confidence: conf,
          directional_trait: "Radial",
        };
      }
    }

    // 5. Check BPFI Band (8.1x - 10.8x 1x)
    if (peakHz >= bpfiLowHz - 1.0 && peakHz <= bpfiHighHz + 1.0) {
      const conf = 90.0;
      if (conf > maxConfidence) {
        maxConfidence = conf;
        bestMatch = {
          measured_frequency_hz: peakHz,
          calculated_frequency_hz: Number(((bpfiLowHz + bpfiHighHz) / 2).toFixed(2)),
          fault_condition: "Bearing Inner Race Defect (BPFI)",
          confidence: conf,
          directional_trait: "Radial",
        };
      }
    }

    // 6. Check BSF Band (2.2x - 3.1x 1x)
    if (peakHz >= bsfLowHz - 0.5 && peakHz <= bsfHighHz + 0.5) {
      const conf = 88.0;
      if (conf > maxConfidence) {
        maxConfidence = conf;
        bestMatch = {
          measured_frequency_hz: peakHz,
          calculated_frequency_hz: Number(((bsfLowHz + bsfHighHz) / 2).toFixed(2)),
          fault_condition: "Bearing Roller Spin Defect (BSF)",
          confidence: conf,
          directional_trait: "Radial",
        };
      }
    }

    // 7. Check FTF Band (0.40x - 0.44x 1x)
    if (peakHz >= ftfLowHz - 0.2 && peakHz <= ftfHighHz + 0.2) {
      const conf = 88.0;
      if (conf > maxConfidence) {
        maxConfidence = conf;
        bestMatch = {
          measured_frequency_hz: peakHz,
          calculated_frequency_hz: Number(((ftfLowHz + ftfHighHz) / 2).toFixed(2)),
          fault_condition: "Bearing Cage Speed Defect (FTF)",
          confidence: conf,
          directional_trait: "Radial",
        };
      }
    }

    if (bestMatch) {
      matched.push(bestMatch);
    } else {
      // Non-synchronous peak or Structural Natural Frequency
      if (peakHz > 3 * shaftSpeedHz) {
        matched.push({
          measured_frequency_hz: peakHz,
          calculated_frequency_hz: peakHz,
          fault_condition: "High-Frequency Anti-Friction Bearing Defect (Non-Synchronous Peak)",
          confidence: 75.0,
          directional_trait: "Radial",
        });
      } else {
        matched.push({
          measured_frequency_hz: peakHz,
          calculated_frequency_hz: peakHz,
          fault_condition: "Structural Resonance / Lack of Support Rigidity (System Natural Frequency)",
          confidence: 70.0,
          directional_trait: "Directional / Speed Independent",
        });
      }
    }
  }

  // Evaluation according to ISO 20816-3
  let isoEval: IsoZoneResult | null = null;
  let verdict = "Unknown";

  if (overall_vibration_rms !== undefined && overall_vibration_rms !== null) {
    isoEval = getIso208163Evaluation(machine_group, foundation_type, overall_vibration_rms);
    verdict = `${isoEval.zone} - ${isoEval.verdict}`;
  }

  return {
    machine_type: "Centrifugal Fan",
    calculated_frequencies: freqs,
    acceptance_verdict: verdict,
    iso_zone: isoEval ? isoEval.zone : undefined,
    acceptance_limit_rms: isoEval ? isoEval.limit : null,
    matched_faults: matched,
  };
}

