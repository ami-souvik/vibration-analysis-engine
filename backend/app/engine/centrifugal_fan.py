from .models import FaultFrequency, MatchedPeak, DiagnosticResult
from .screw_compressor import match_peaks
from typing import Dict, List, Optional

def get_iso20816_3_zone(machine_group: str, foundation_type: str, overall_rms: float) -> str:
    # Basic implementation of ISO 20816-3
    # Group 1: > 300 kW
    # Group 2: 15 - 300 kW
    limits = {
        "Group 1": {
            "Rigid": [2.3, 4.5, 7.1],
            "Flexible": [3.5, 7.1, 11.0]
        },
        "Group 2": {
            "Rigid": [1.4, 2.8, 4.5],
            "Flexible": [2.3, 4.5, 7.1]
        }
    }
    
    group_limits = limits.get(machine_group, {}).get(foundation_type)
    if not group_limits:
        return "Unknown Configuration"
        
    if overall_rms <= group_limits[0]:
        return "Zone A (Newly commissioned)"
    elif overall_rms <= group_limits[1]:
        return "Zone B (Unrestricted long-term operation)"
    elif overall_rms <= group_limits[2]:
        return "Zone C (Limited operation)"
    else:
        return "Zone D (Danger of damage)"

def diagnose_centrifugal_fan(
    fan_rpm: float,
    vanes: int,
    foundation_type: str,
    machine_group: str,
    measured_peaks: Dict[str, float],
    overall_vibration_rms: Optional[float] = None
) -> DiagnosticResult:
    shaft_speed_hz = fan_rpm / 60.0
    bpf_hz = vanes * shaft_speed_hz
    
    freqs = []
    
    # 1x and 2x Shaft Speed
    freqs.append(FaultFrequency(label="1x Shaft Speed", frequency_hz=shaft_speed_hz, description="Impeller Unbalance"))
    freqs.append(FaultFrequency(label="2x Shaft Speed", frequency_hz=2 * shaft_speed_hz, description="Coupling Misalignment"))
    
    # Mechanical Looseness (up to 4x)
    for i in range(1, 5):
        freqs.append(FaultFrequency(label=f"{i}x Shaft Speed", frequency_hz=i * shaft_speed_hz, description="Mechanical Looseness"))
        
    # Aerodynamic bands (using midpoints)
    stall_midpoint = ((0.66 + 0.75) / 2) * shaft_speed_hz
    surge_midpoint = ((0.33 + 0.50) / 2) * shaft_speed_hz
    freqs.append(FaultFrequency(label="Stall Band Midpoint", frequency_hz=stall_midpoint, description="Aerodynamic Stall"))
    freqs.append(FaultFrequency(label="Surge Band Midpoint", frequency_hz=surge_midpoint, description="Aerodynamic Surge"))
    
    # Blade Pass Frequency (BPF)
    freqs.append(FaultFrequency(label="1x BPF", frequency_hz=bpf_hz, description="Blade Pass Frequency"))
    freqs.append(FaultFrequency(label="2x BPF", frequency_hz=2 * bpf_hz, description="2x Blade Pass Frequency"))
    
    # Bearing Faults (using average ratios for generic roller bearings)
    freqs.append(FaultFrequency(label="BPFO", frequency_hz=7.35 * shaft_speed_hz, description="Outer Race Defect"))
    freqs.append(FaultFrequency(label="BPFI", frequency_hz=9.45 * shaft_speed_hz, description="Inner Race Defect"))
    freqs.append(FaultFrequency(label="BSF", frequency_hz=2.65 * shaft_speed_hz, description="Roller Spin Defect"))
    freqs.append(FaultFrequency(label="FTF", frequency_hz=0.42 * shaft_speed_hz, description="Cage Speed Defect"))
    
    matched = match_peaks(freqs, measured_peaks)
    
    verdict = "Unknown"
    if overall_vibration_rms is not None:
        verdict = get_iso20816_3_zone(machine_group, foundation_type, overall_vibration_rms)
        
    return DiagnosticResult(
        machine_type="Centrifugal Fan",
        calculated_frequencies=freqs,
        acceptance_verdict=verdict,
        acceptance_limit_rms=None, # In Zones, there are multiple limits, so we leave this None or we could store the Zone C limit
        matched_faults=matched
    )
