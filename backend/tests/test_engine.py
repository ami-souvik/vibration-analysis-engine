import pytest
from app.engine.screw_compressor import diagnose_screw_compressor
from app.engine.centrifugal_fan import diagnose_centrifugal_fan

def test_screw_compressor_math():
    # Worked example: motor speed 1,480 RPM, 4-lobe male rotor, 6-lobe female rotor
    result = diagnose_screw_compressor(
        motor_rpm=1480,
        male_lobes=4,
        female_lobes=6,
        foundation_type="Rigid",
        machine_group="Group 1",
        measured_peaks={},
        overall_vibration_rms=1.5
    )
    
    freqs = {f.label: f.frequency_hz for f in result.calculated_frequencies}
    
    # 1x male speed = 1480 / 60 = 24.666...
    assert pytest.approx(freqs["1x Male Speed"], 0.01) == 24.67
    
    # 1x female speed = 1480 * (4/6) / 60 = 16.444...
    assert pytest.approx(freqs["1x Female Speed"], 0.01) == 16.44
    
    # RMF = 4 * 24.67 = 98.666...
    assert pytest.approx(freqs["RMF"], 0.01) == 98.67
    
    # 2x RMF = 197.333...
    assert pytest.approx(freqs["2x RMF"], 0.01) == 197.33
    
    # Verdict for Group 1 Rigid with 1.5 RMS (limit is 2.0) should be Pass
    assert result.acceptance_verdict == "Pass"
    assert result.acceptance_limit_rms == 2.0

def test_centrifugal_fan_math():
    # Worked example: fan RPM 2,980, 11 vanes
    result = diagnose_centrifugal_fan(
        fan_rpm=2980,
        vanes=11,
        foundation_type="Flexible",
        machine_group="Group 1",
        measured_peaks={},
        overall_vibration_rms=6.5
    )
    
    freqs = {f.label: f.frequency_hz for f in result.calculated_frequencies}
    
    # 1x shaft speed = 2980 / 60 = 49.666...
    assert pytest.approx(freqs["1x Shaft Speed"], 0.01) == 49.67
    
    # 2x shaft speed = 99.333...
    assert pytest.approx(freqs["2x Shaft Speed"], 0.01) == 99.33
    
    # BPF = 11 * 49.67 = 546.333...
    assert pytest.approx(freqs["1x BPF"], 0.01) == 546.33
    
    # 2x BPF = 1092.666...
    assert pytest.approx(freqs["2x BPF"], 0.01) == 1092.67
    
    # Verdict for Group 1 Flexible with 6.5 RMS
    # Limits are: A: 3.5, B: 7.1, C: 11.0. 6.5 is in Zone B.
    assert result.acceptance_verdict == "Zone B (Unrestricted long-term operation)"
