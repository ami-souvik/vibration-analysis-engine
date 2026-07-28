import { DiagnosticResult, ExtractedMachineParams } from "../engine/models";

export function generateDiagnosisNarration(
  result: DiagnosticResult,
  _operatorInput: string = "",
  params?: ExtractedMachineParams | null
): string {
  const lines: string[] = [];
  lines.push("Thank you for the complete information.\n");

  const fanRpm = params?.fan_rpm || params?.motor_rpm || 0;
  const shaftSpeedHz = fanRpm / 60.0;
  const vanes = params?.vanes || 0;

  // 1. Key Mathematical Deductions
  lines.push("* Key mathematical deductions:");
  lines.push(`    * Fan Shaft Running Speed (1x): ${shaftSpeedHz.toFixed(2)} Hz (${Math.round(fanRpm)} CPM)`);
  lines.push(`    * 2x Running Speed (Misalignment Index): ${(2 * shaftSpeedHz).toFixed(2)} Hz (${Math.round(2 * fanRpm)} CPM)`);

  if (vanes > 0) {
    const bpfHz = vanes * shaftSpeedHz;
    lines.push(`    * Blade Pass Frequency (BPF = ${vanes} Vanes x ${shaftSpeedHz.toFixed(2)} Hz): ${bpfHz.toFixed(2)} Hz (${Math.round(bpfHz * 60)} CPM)`);
    lines.push(`    * 2x Blade Pass Frequency (2x BPF): ${(2 * bpfHz).toFixed(2)} Hz (${Math.round(2 * bpfHz * 60)} CPM)`);
  }

  const stallLowHz = 0.66 * shaftSpeedHz;
  const stallHighHz = 0.75 * shaftSpeedHz;
  lines.push(`    * Aerodynamic Stall Range (66% to 75% of 1x): ${stallLowHz.toFixed(2)} Hz - ${stallHighHz.toFixed(2)} Hz (${Math.round(stallLowHz * 60)} - ${Math.round(stallHighHz * 60)} CPM)`);

  const surgeLowHz = 0.33 * shaftSpeedHz;
  const surgeHighHz = 0.50 * shaftSpeedHz;
  lines.push(`    * Aerodynamic Surge Range (33% to 50% of 1x): ${surgeLowHz.toFixed(2)} Hz - ${surgeHighHz.toFixed(2)} Hz (${Math.round(surgeLowHz * 60)} - ${Math.round(surgeHighHz * 60)} CPM)`);

  lines.push("");

  // 2. Bearing Frequencies
  const bearingNumbers = params?.bearing_numbers || [];
  lines.push("* Spherical Roller / Anti-Friction Bearing Fault Frequencies:");
  if (bearingNumbers.length > 0) {
    lines.push(`    * Bearings identified: ${bearingNumbers.join(", ")}.`);
  } else {
    lines.push("    * Bearing Type: Anti-Friction / Spherical Roller Bearings.");
  }
  lines.push(`    * BPFO (Outer Race): ~6.2x to 8.5x running speed -> ${(6.2 * shaftSpeedHz).toFixed(1)} Hz to ${(8.5 * shaftSpeedHz).toFixed(1)} Hz (${Math.round(6.2 * fanRpm)} to ${Math.round(8.5 * fanRpm)} CPM)`);
  lines.push(`    * BPFI (Inner Race): ~8.1x to 10.8x running speed -> ${(8.1 * shaftSpeedHz).toFixed(1)} Hz to ${(10.8 * shaftSpeedHz).toFixed(1)} Hz (${Math.round(8.1 * fanRpm)} to ${Math.round(10.8 * fanRpm)} CPM)`);
  lines.push(`    * BSF (Roller Spin): ~2.2x to 3.1x running speed -> ${(2.2 * shaftSpeedHz).toFixed(1)} Hz to ${(3.1 * shaftSpeedHz).toFixed(1)} Hz (${Math.round(2.2 * fanRpm)} to ${Math.round(3.1 * fanRpm)} CPM)`);
  lines.push(`    * FTF (Cage Speed): ~0.40x to 0.44x running speed -> ${(0.40 * shaftSpeedHz).toFixed(1)} Hz to ${(0.44 * shaftSpeedHz).toFixed(1)} Hz (${Math.round(0.40 * fanRpm)} to ${Math.round(0.44 * fanRpm)} CPM)`);

  lines.push("");

  // 3. Vibration Analysis (ISO 20816-3)
  lines.push("Vibration Analysis (ISO 20816-3 Criteria):");
  if (result.acceptance_limit_rms !== null && params && params.overall_vibration_rms !== undefined && params.overall_vibration_rms !== null) {
    const zoneStr = result.iso_zone ? ` (${result.iso_zone})` : "";
    const groupStr = params.machine_group || "Group 2";
    const fdnStr = params.foundation_type || "Flexible";

    lines.push(
      `* Standard Evaluation (ISO 20816-3): The overall vibration of ${params.overall_vibration_rms} mm/s RMS is evaluated as **${result.acceptance_verdict}**${zoneStr} for ${groupStr} / ${fdnStr} foundation.`
    );
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
        const traitStr = match.directional_trait ? `, Trait: ${match.directional_trait}` : "";
        bestMatches[peak] = `Matches **${match.fault_condition}** (Calculated: ${match.calculated_frequency_hz.toFixed(
          2
        )} Hz, Confidence: ${match.confidence}%${traitStr})`;
      }
    }

    const sortedPeaks = Object.keys(bestMatches)
      .map(Number)
      .sort((a, b) => a - b);
    for (const peakHz of sortedPeaks) {
      lines.push(`    * Measured peak at ${peakHz.toFixed(2)} Hz (${Math.round(peakHz * 60)} CPM): ${bestMatches[peakHz]}`);
    }
  } else {
    lines.push("    * No significant peak frequencies matched known fault thresholds.");
  }

  lines.push("");

  // 4. Preliminary Diagnosis
  lines.push("Preliminary Diagnosis:");

  const isZoneC = result.iso_zone === "Zone C";
  const isZoneD = result.iso_zone === "Zone D";

  const criticalFaults = result.matched_faults.filter(
    (m) =>
      m.fault_condition.includes("Defect") ||
      m.fault_condition.includes("Stall") ||
      m.fault_condition.includes("Surge") ||
      m.fault_condition.includes("Unbalance") ||
      m.fault_condition.includes("Misalignment")
  );

  let severity = "NORMAL / ZONE A - B ACCEPTABLE";
  if (isZoneD) {
    severity = "CRITICAL / ZONE D - High Risk of Damage (Immediate Shutdown)";
  } else if (isZoneC || criticalFaults.length > 0) {
    severity = "MODERATE TO HIGH / ZONE C - Action Recommended";
  }

  lines.push(`* Severity: ${severity}`);

  const faultSummary =
    result.matched_faults.length > 0
      ? Array.from(new Set(result.matched_faults.map((m) => m.fault_condition))).join("; ")
      : "No critical fault detected.";
  lines.push(`* Fault: ${faultSummary}`);

  const actions: string[] = [];
  if (result.matched_faults.some((m) => m.fault_condition.includes("Unbalance"))) {
    actions.push("Perform dynamic balancing of the fan impeller and inspect for material buildup or blade wear.");
  }
  if (result.matched_faults.some((m) => m.fault_condition.includes("Misalignment"))) {
    actions.push("Check shaft coupling alignment between motor and fan rotor in axial and radial directions.");
  }
  if (result.matched_faults.some((m) => m.fault_condition.includes("Stall") || m.fault_condition.includes("Surge"))) {
    actions.push("Inspect airflow system, damper positions, and ductwork for flow restriction or flow reversal causing aerodynamic instability.");
  }
  if (result.matched_faults.some((m) => m.fault_condition.includes("Blade Pass") || m.fault_condition.includes("BPF"))) {
    actions.push("Inspect inlet cone alignment and check for internal flow obstructions near the impeller blades.");
  }
  if (result.matched_faults.some((m) => m.fault_condition.includes("Bearing") || m.fault_condition.includes("Race") || m.fault_condition.includes("BPFO") || m.fault_condition.includes("BPFI"))) {
    actions.push("Schedule bearing inspection/replacement for anti-friction bearings displaying defect frequencies.");
  }
  if (actions.length === 0) {
    actions.push("Continue routine vibration monitoring according to standard maintenance schedule.");
  }

  lines.push(`* Action: ${actions.join(" ")}`);

  return lines.join("\n");
}

