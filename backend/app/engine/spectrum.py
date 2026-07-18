from pydantic import BaseModel
from typing import List, Optional, Dict
import math

class BearingGeometry(BaseModel):
    bearing_number: str
    balls: int
    ball_diameter: float
    pitch_diameter: float
    contact_angle: float

# Mock Database
BEARING_DB = {
    "7309": BearingGeometry(bearing_number="7309", balls=16, ball_diameter=12.5, pitch_diameter=90.0, contact_angle=0.0),
    "NU 309": BearingGeometry(bearing_number="NU 309", balls=14, ball_diameter=14.0, pitch_diameter=95.0, contact_angle=0.0),
    "6310": BearingGeometry(bearing_number="6310", balls=8, ball_diameter=15.0, pitch_diameter=100.0, contact_angle=0.0),
    "3387": BearingGeometry(bearing_number="3387", balls=12, ball_diameter=10.0, pitch_diameter=80.0, contact_angle=0.0)
}

class FaultFrequencyResult(BaseModel):
    label: str
    frequency_hz: float
    ratio: str
    description: str

def calculate_spectrum_faults(
    shaft_rpm: float,
    balls: int,
    ball_diameter: float,
    pitch_diameter: float,
    contact_angle: float
) -> List[FaultFrequencyResult]:
    
    fs = shaft_rpm / 60.0
    if fs == 0 or pitch_diameter == 0:
        return []

    # Convert angle to radians
    angle_rad = math.radians(contact_angle)
    
    # Formulas
    # FTF = (fs/2) * (1 - (Bd/Pd)*cos(theta))
    ftf = (fs / 2.0) * (1.0 - (ball_diameter / pitch_diameter) * math.cos(angle_rad))
    
    # BPFO = balls * FTF
    bpfo = balls * ftf
    
    # BPFI = (balls * fs / 2) * (1 + (Bd/Pd)*cos(theta))
    bpfi = (balls * fs / 2.0) * (1.0 + (ball_diameter / pitch_diameter) * math.cos(angle_rad))
    
    # BSF = (Pd / 2Bd) * fs * (1 - (Bd/Pd * cos(theta))^2)
    bsf = (pitch_diameter / (2.0 * ball_diameter)) * fs * (1.0 - math.pow((ball_diameter / pitch_diameter) * math.cos(angle_rad), 2))

    return [
        FaultFrequencyResult(label="Shaft (1x)", frequency_hz=round(fs, 2), ratio="1.00x", description="Reference - running speed"),
        FaultFrequencyResult(label="FTF - Fundamental Train Frequency", frequency_hz=round(ftf, 2), ratio=f"{ftf/fs:.2f}x", description="Cage defect"),
        FaultFrequencyResult(label="BPFO - Ball Pass Outer Race", frequency_hz=round(bpfo, 2), ratio=f"{bpfo/fs:.2f}x", description="Outer race defect"),
        FaultFrequencyResult(label="BPFI - Ball Pass Inner Race", frequency_hz=round(bpfi, 2), ratio=f"{bpfi/fs:.2f}x", description="Inner race defect"),
        FaultFrequencyResult(label="BSF - Ball Spin Frequency", frequency_hz=round(bsf, 2), ratio=f"{bsf/fs:.2f}x", description="Rolling element defect")
    ]
