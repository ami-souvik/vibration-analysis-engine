from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class FaultFrequency(BaseModel):
    label: str
    frequency_hz: float
    description: str

class MatchedPeak(BaseModel):
    measured_frequency_hz: float
    calculated_frequency_hz: float
    fault_condition: str
    confidence: float # percentage

class DiagnosticResult(BaseModel):
    machine_type: str
    calculated_frequencies: List[FaultFrequency]
    acceptance_verdict: str
    acceptance_limit_rms: Optional[float] = None
    matched_faults: List[MatchedPeak]
