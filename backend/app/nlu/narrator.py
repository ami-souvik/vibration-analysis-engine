from typing import Optional, Dict
from app.engine.models import DiagnosticResult
from app.nlu.parser import ExtractedMachineParams

def generate_diagnosis_narration(
    result: DiagnosticResult, 
    operator_input: str = "",
    params: Optional[ExtractedMachineParams] = None
) -> str:
    lines = []
    lines.append("Thank you for the complete information.\n")
    
    # 1. Key Mathematical Deductions
    lines.append("* Key mathematical deductions:")
    male_speed_hz = None
    rmf_hz = None
    deductions_done = set()
    
    for calc in result.calculated_frequencies:
        if calc.label == "1x Male Speed" and "male" not in deductions_done:
            male_speed_hz = calc.frequency_hz
            lines.append(f"    * Male Rotor Speed (1x Male Speed): {male_speed_hz:.2f} Hz")
            deductions_done.add("male")
        elif calc.label == "RMF" and "rmf" not in deductions_done:
            rmf_hz = calc.frequency_hz
            lines.append(f"    * Rotor Mesh Frequency (RMF): {rmf_hz:.2f} Hz")
            deductions_done.add("rmf")
            
    if params and params.female_lobes and params.male_lobes and male_speed_hz and "female" not in deductions_done:
        female_speed_hz = male_speed_hz * (params.male_lobes / params.female_lobes)
        lines.append(f"    * Female Rotor Speed (1x Female Speed): {female_speed_hz:.2f} Hz")
        deductions_done.add("female")
        
    lines.append("")
    
    # 2. Bearing Frequencies
    bearing_numbers = params.bearing_numbers if (params and params.bearing_numbers) else []
    if bearing_numbers:
        lines.append("* Bearing Type Determination / Bearing Frequencies:")
        lines.append(f"    * Bearings identified: {', '.join(bearing_numbers)}.")
        
        for bearing in bearing_numbers:
            bearing_calc = [c for c in result.calculated_frequencies if bearing.upper() in c.label.upper() or bearing in c.label]
            if bearing_calc:
                lines.append(f"    * Calculated Bearing Frequencies for {bearing}:")
                for c in bearing_calc:
                    clean_label = c.label.split("(")[0].strip()
                    lines.append(f"        * {clean_label} ({c.description}): {c.frequency_hz:.2f} Hz")
        lines.append("")
    
    # 3. Vibration Analysis
    lines.append("Vibration Analysis:")
    if result.acceptance_limit_rms is not None and params and params.overall_vibration_rms is not None:
        if result.acceptance_verdict == "Pass":
            lines.append(f"* Standard Limit (VDI 3836): The overall vibration of {params.overall_vibration_rms} mm/s RMS is WITHIN acceptable limits for {params.foundation_type or 'Rigid'} foundation / {params.machine_group or 'Group 1'} (Limit: {result.acceptance_limit_rms} mm/s RMS).")
        else:
            lines.append(f"* Standard Limit (VDI 3836): The overall vibration of {params.overall_vibration_rms} mm/s RMS EXCEEDS the threshold for {params.foundation_type or 'Rigid'} foundation / {params.machine_group or 'Group 1'} (Limit: {result.acceptance_limit_rms} mm/s RMS).")
    elif params and params.overall_vibration_rms is not None:
        lines.append(f"* Overall Vibration: {params.overall_vibration_rms} mm/s RMS.")
    else:
        lines.append("* Standard Limit: Overall vibration RMS not provided.")
        
    lines.append("* Peak Frequency Analysis:")
    if result.matched_faults:
        # Group by measured peak frequency and pick the highest confidence match for each peak
        best_matches: Dict[float, str] = {}
        highest_conf: Dict[float, float] = {}
        for match in result.matched_faults:
            peak = match.measured_frequency_hz
            if peak not in highest_conf or match.confidence > highest_conf[peak]:
                highest_conf[peak] = match.confidence
                best_matches[peak] = f"Matches {match.fault_condition} (Calculated: {match.calculated_frequency_hz:.2f} Hz, Confidence: {match.confidence}%)"
                
        for peak_hz in sorted(best_matches.keys()):
            lines.append(f"    * Measured peak at {peak_hz:.2f} Hz: {best_matches[peak_hz]}")
    else:
        lines.append("    * No significant peak frequencies matched known fault thresholds.")
        
    lines.append("")
    
    # 4. Preliminary Diagnosis
    lines.append("Preliminary Diagnosis:")
    
    is_fail = result.acceptance_verdict == "Fail"
    critical_faults = [m for m in result.matched_faults if "Defect" in m.fault_condition or "Contact" in m.fault_condition or "Looseness" in m.fault_condition]
    
    if is_fail or len(critical_faults) > 0:
        severity = "HIGH - Immediate Attention Required" if (is_fail and len(critical_faults) > 0) else "MODERATE - Action Recommended"
    else:
        severity = "NORMAL / ACCEPTABLE"
        
    lines.append(f"* Severity: {severity}")
    
    fault_summary = ", ".join(list(set([m.fault_condition for m in result.matched_faults]))) if result.matched_faults else "No critical fault detected."
    lines.append(f"* Fault: {fault_summary}")
    
    actions = []
    if is_fail:
        actions.append("Inspect machine alignment and foundation rigidity due to elevated overall RMS vibration.")
    if any("Bearing" in m.fault_condition or "Race" in m.fault_condition for m in result.matched_faults):
        actions.append("Schedule bearing inspection/replacement for indicated bearings showing non-synchronous frequencies.")
    if any("Unbalance" in m.fault_condition for m in result.matched_faults):
        actions.append("Check rotor balance and check for fouling on male/female lobes.")
    if not actions:
        actions.append("Continue routine vibration monitoring according to standard maintenance schedule.")
        
    lines.append(f"* Action: {' '.join(actions)}")
    
    return "\n".join(lines)
