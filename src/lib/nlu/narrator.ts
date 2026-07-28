import { DiagnosticResult, ExtractedMachineParams } from "../engine/models";

export function generateDiagnosisNarration(
  result: DiagnosticResult,
  _operatorInput: string = "",
  params?: ExtractedMachineParams | null
): string {
  const lines: string[] = [];
  lines.push("Thank you for the complete information.\n");

  // 1. Key Mathematical Deductions
  lines.push("* Key mathematical deductions:");
  let maleSpeedHz: number | null = null;
  let rmfHz: number | null = null;
  const deductionsDone = new Set<string>();

  for (const calc of result.calculated_frequencies) {
    if (calc.label === "1x Male Speed" && !deductionsDone.has("male")) {
      maleSpeedHz = calc.frequency_hz;
      lines.push(`    * Male Rotor Speed (1x Male Speed): ${maleSpeedHz.toFixed(2)} Hz`);
      deductionsDone.add("male");
    } else if (calc.label === "RMF" && !deductionsDone.has("rmf")) {
      rmfHz = calc.frequency_hz;
      lines.push(`    * Rotor Mesh Frequency (RMF): ${rmfHz.toFixed(2)} Hz`);
      deductionsDone.add("rmf");
    }
  }

  if (
    params &&
    params.female_lobes &&
    params.male_lobes &&
    maleSpeedHz !== null &&
    !deductionsDone.has("female")
  ) {
    const femaleSpeedHz = maleSpeedHz * (params.male_lobes / params.female_lobes);
    lines.push(`    * Female Rotor Speed (1x Female Speed): ${femaleSpeedHz.toFixed(2)} Hz`);
    deductionsDone.add("female");
  }

  lines.push("");

  // 2. Bearing Frequencies
  const bearingNumbers = params?.bearing_numbers || [];
  if (bearingNumbers.length > 0) {
    lines.push("* Bearing Type Determination / Bearing Frequencies:");
    lines.push(`    * Bearings identified: ${bearingNumbers.join(", ")}.`);

    for (const bearing of bearingNumbers) {
      const bearingCalc = result.calculated_frequencies.filter(
        (c) => c.label.toUpperCase().includes(bearing.toUpperCase()) || c.label.includes(bearing)
      );
      if (bearingCalc.length > 0) {
        lines.push(`    * Calculated Bearing Frequencies for ${bearing}:`);
        for (const c of bearingCalc) {
          const cleanLabel = c.label.split("(")[0].trim();
          lines.push(`        * ${cleanLabel} (${c.description}): ${c.frequency_hz.toFixed(2)} Hz`);
        }
      }
    }
    lines.push("");
  }

  // 3. Vibration Analysis
  lines.push("Vibration Analysis:");
  if (result.acceptance_limit_rms !== null && params && params.overall_vibration_rms !== undefined && params.overall_vibration_rms !== null) {
    if (result.acceptance_verdict === "Pass") {
      lines.push(
        `* Standard Limit (VDI 3836): The overall vibration of ${params.overall_vibration_rms} mm/s RMS is WITHIN acceptable limits for ${
          params.foundation_type || "Rigid"
        } foundation / ${params.machine_group || "Group 1"} (Limit: ${result.acceptance_limit_rms} mm/s RMS).`
      );
    } else {
      lines.push(
        `* Standard Limit (VDI 3836): The overall vibration of ${params.overall_vibration_rms} mm/s RMS EXCEEDS the threshold for ${
          params.foundation_type || "Rigid"
        } foundation / ${params.machine_group || "Group 1"} (Limit: ${result.acceptance_limit_rms} mm/s RMS).`
      );
    }
  } else if (params && params.overall_vibration_rms !== undefined && params.overall_vibration_rms !== null) {
    lines.push(`* Overall Vibration: ${params.overall_vibration_rms} mm/s RMS.`);
  } else {
    lines.push("* Standard Limit: Overall vibration RMS not provided.");
  }

  lines.push("* Peak Frequency Analysis:");
  if (result.matched_faults.length > 0) {
    const bestMatches: Record<number, string> = {};
    const highestConf: Record<number, number> = {};

    for (const match of result.matched_faults) {
      const peak = match.measured_frequency_hz;
      if (highestConf[peak] === undefined || match.confidence > highestConf[peak]) {
        highestConf[peak] = match.confidence;
        bestMatches[peak] = `Matches ${match.fault_condition} (Calculated: ${match.calculated_frequency_hz.toFixed(
          2
        )} Hz, Confidence: ${match.confidence}%)`;
      }
    }

    const sortedPeaks = Object.keys(bestMatches)
      .map(Number)
      .sort((a, b) => a - b);
    for (const peakHz of sortedPeaks) {
      lines.push(`    * Measured peak at ${peakHz.toFixed(2)} Hz: ${bestMatches[peakHz]}`);
    }
  } else {
    lines.push("    * No significant peak frequencies matched known fault thresholds.");
  }

  lines.push("");

  // 4. Preliminary Diagnosis
  lines.push("Preliminary Diagnosis:");

  const isFail = result.acceptance_verdict === "Fail";
  const criticalFaults = result.matched_faults.filter(
    (m) =>
      m.fault_condition.includes("Defect") ||
      m.fault_condition.includes("Contact") ||
      m.fault_condition.includes("Looseness")
  );

  let severity = "NORMAL / ACCEPTABLE";
  if (isFail || criticalFaults.length > 0) {
    severity =
      isFail && criticalFaults.length > 0
        ? "HIGH - Immediate Attention Required"
        : "MODERATE - Action Recommended";
  }

  lines.push(`* Severity: ${severity}`);

  const faultSummary =
    result.matched_faults.length > 0
      ? Array.from(new Set(result.matched_faults.map((m) => m.fault_condition))).join(", ")
      : "No critical fault detected.";
  lines.push(`* Fault: ${faultSummary}`);

  const actions: string[] = [];
  if (isFail) {
    actions.push("Inspect machine alignment and foundation rigidity due to elevated overall RMS vibration.");
  }
  if (result.matched_faults.some((m) => m.fault_condition.includes("Bearing") || m.fault_condition.includes("Race"))) {
    actions.push("Schedule bearing inspection/replacement for indicated bearings showing non-synchronous frequencies.");
  }
  if (result.matched_faults.some((m) => m.fault_condition.includes("Unbalance"))) {
    actions.push("Check rotor balance and check for fouling on male/female lobes.");
  }
  if (actions.length === 0) {
    actions.push("Continue routine vibration monitoring according to standard maintenance schedule.");
  }

  lines.push(`* Action: ${actions.join(" ")}`);

  return lines.join("\n");
}
