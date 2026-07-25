from pydantic import BaseModel, Field
from typing import Optional, List
import os
from google import genai
from google.genai import types

class ExtractedPeak(BaseModel):
    name: str = Field(description="Description or name of the peak")
    frequency_hz: float = Field(description="Frequency of the peak in Hz")

class ExtractedMachineParams(BaseModel):
    motor_rpm: Optional[float] = Field(default=None, description="Running speed in RPM")
    male_lobes: Optional[int] = Field(default=None, description="Number of lobes on male rotor")
    female_lobes: Optional[int] = Field(default=None, description="Number of lobes on female rotor")
    foundation_type: Optional[str] = Field(default=None, description="One of: 'Rigid', 'Flexible'")
    machine_group: Optional[str] = Field(default=None, description="One of: 'Group 1 (Process Gas)', 'Group 2 (Oil-Free Air)', 'Group 3 (Oil-Flooded)'")
    bearing_numbers: Optional[List[str]] = Field(default=None, description="List of bearing designations, e.g. ['7309 DE', 'NU 309']")
    measured_peaks: Optional[List[ExtractedPeak]] = Field(default=None, description="List of measured peaks with their frequencies in Hz")
    overall_vibration_rms: Optional[float] = Field(default=None, description="Overall vibration in mm/s RMS")
    
    missing_fields: List[str] = Field(default_factory=list, description="List of fields that are required but missing from the input")
    conversational_reply: Optional[str] = Field(default=None, description="Use this field to reply naturally if the user just says hello, or to ask for clarification on missing parameters.")

def parse_operator_input(text: str, expected_type: Optional[str] = None) -> ExtractedMachineParams:
    """
    Parses free-text input from the operator to extract structured parameters.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # Fallback for dev without API key
        return ExtractedMachineParams(
            missing_fields=["GEMINI_API_KEY_MISSING"]
        )
        
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
=== PERSONA & ROLE ===
You are VDX · Diagnostic Engine, an expert NLU parser for rotating machinery and screw compressor vibration diagnostics.
Your job is to analyze the operator's input text (which may span single or multiple conversation turns) and extract telemetry parameters into the structured schema.

=== SMART INTAKE RULE ===
Check if the operator input contains ALL required diagnostic telemetry fields:
1. Speed in RPM (`motor_rpm`)
2. Male rotor lobes count (`male_lobes`)
3. Female rotor lobes count (`female_lobes`)
4. Foundation type: Rigid or Flexible (`foundation_type`)
5. Compressor Machine Group / Type: Oil-Free, Oil-Flooded, or Process Gas (`machine_group`)
6. Bearing designation / numbers (`bearing_numbers`, e.g. 7309 DE, NU 309)
7. Overall vibration in mm/s RMS (`overall_vibration_rms`)
8. Measured peak frequencies in Hz (`measured_peaks`)

- If ALL required fields are present: extract them cleanly and leave `missing_fields` empty and `conversational_reply` null.
- If ANY required fields are missing and NO telemetry data is provided (e.g. user just says "Hello" or asks a general question): populate `conversational_reply` with a natural greeting asking specifically for the missing items.
- If SOME fields are present but SOME are missing: extract all provided fields into the schema and list ONLY the unprovided items in `missing_fields`.

=== EXTRACTION RULES & HINTS ===
- Machine Group Mapping:
  - "Oil-Free" -> "Group 2 (Oil-Free Air)"
  - "Oil-Flooded" -> "Group 3 (Oil-Flooded)"
  - "Process Gas" -> "Group 1 (Process Gas)"
- Speed: Look for values followed by "RPM" or "speed".
- Lobes: Distinguish male vs female lobe counts (e.g., "4 male lobes, 6 female lobes" -> male_lobes: 4, female_lobes: 6).
- Bearings: Extract bearing model designations such as "7309 DE", "NU 309 NDE", etc.
- Peaks: Extract all frequency numbers given in Hz into `measured_peaks`.
- Strict Rule: DO NOT guess or infer values not mentioned in the input.

Operator Input History:
"{text}"
"""
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ExtractedMachineParams,
            temperature=0.0
        ),
    )
    
    return ExtractedMachineParams.model_validate_json(response.text)
