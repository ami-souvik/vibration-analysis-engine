from .models import FaultFrequency, MatchedPeak, DiagnosticResult
from typing import Dict, List, Optional

def match_peaks(calculated_freqs: List[FaultFrequency], measured_peaks: Dict[str, float], tolerance_pct: float = 2.0) -> List[MatchedPeak]:
    matched = []
    for peak_name, peak_hz in measured_peaks.items():
        for calc in calculated_freqs:
            tolerance = calc.frequency_hz * (tolerance_pct / 100.0)
            if abs(peak_hz - calc.frequency_hz) <= tolerance:
                # Calculate confidence based on how close it is
                diff = abs(peak_hz - calc.frequency_hz)
                confidence = max(0.0, 100.0 * (1 - (diff / tolerance)))
                matched.append(MatchedPeak(
                    measured_frequency_hz=peak_hz,
                    calculated_frequency_hz=calc.frequency_hz,
                    fault_condition=calc.description,
                    confidence=round(confidence, 1)
                ))
    return matched

def get_vdi3836_limit(machine_group: str, foundation_type: str) -> Optional[float]:
    limits = {
        "Group 1": {"Rigid": 2.0, "Flexible": 3.0},
        "Group 2": {"Rigid": 3.0, "Flexible": 5.0},
        "Group 3": {"Rigid": 3.0, "Flexible": 4.5},
    }
    return limits.get(machine_group, {}).get(foundation_type)

def diagnose_screw_compressor(
    motor_rpm: float,
    male_lobes: int,
    female_lobes: int,
    foundation_type: str,
    machine_group: str,
    measured_peaks: Dict[str, float],
    overall_vibration_rms: Optional[float] = None
) -> DiagnosticResult:
    male_speed_hz = motor_rpm / 60.0
    female_speed_hz = (motor_rpm * (male_lobes / female_lobes)) / 60.0
    rmf_hz = male_lobes * male_speed_hz
    
    freqs = []
    
    # 1x and 2x Male Speed
    freqs.append(FaultFrequency(label="1x Male Speed", frequency_hz=male_speed_hz, description="Male Rotor Unbalance / Misalignment"))
    freqs.append(FaultFrequency(label="2x Male Speed", frequency_hz=2 * male_speed_hz, description="Misalignment"))
    
    # 1x Female Speed
    freqs.append(FaultFrequency(label="1x Female Speed", frequency_hz=female_speed_hz, description="Female Rotor Unbalance"))
    
    # RMF (Pocket Passing)
    freqs.append(FaultFrequency(label="RMF", frequency_hz=rmf_hz, description="Normal Gas Pulsation"))
    freqs.append(FaultFrequency(label="2x RMF", frequency_hz=2 * rmf_hz, description="Rotor-to-Rotor Contact"))
    
    # Casing Distortion
    freqs.append(FaultFrequency(label="Casing Distortion", frequency_hz=male_speed_hz + rmf_hz, description="Casing Distortion"))
    
    # Mechanical Looseness (up to 4x)
    for i in range(1, 5):
        freqs.append(FaultFrequency(label=f"{i}x Male Speed", frequency_hz=i * male_speed_hz, description="Mechanical Looseness"))
        
    matched = match_peaks(freqs, measured_peaks)
    
    limit = get_vdi3836_limit(machine_group, foundation_type)
    
    verdict = "Unknown"
    if limit is not None and overall_vibration_rms is not None:
        if overall_vibration_rms <= limit:
            verdict = "Pass"
        else:
            verdict = "Fail"
    elif overall_vibration_rms is None:
         verdict = "No overall vibration provided"
            
    return DiagnosticResult(
        machine_type="Screw Compressor",
        calculated_frequencies=freqs,
        acceptance_verdict=verdict,
        acceptance_limit_rms=limit,
        matched_faults=matched
    )
