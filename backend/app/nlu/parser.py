from pydantic import BaseModel, Field
from typing import Optional, List
import os
import json
from google import genai
from google.genai import types

class ExtractedPeak(BaseModel):
    name: str = Field(description="Description or name of the peak")
    frequency_hz: float = Field(description="Frequency of the peak in Hz")

class ExtractedMachineParams(BaseModel):
    machine_type: Optional[str] = Field(default=None, description="One of: 'Screw Compressor', 'Centrifugal Fan', 'Pump', 'Motor'")
    motor_rpm: Optional[float] = Field(default=None, description="Running speed in RPM")
    male_lobes: Optional[int] = Field(default=None, description="Number of lobes on male rotor (screw compressor)")
    female_lobes: Optional[int] = Field(default=None, description="Number of lobes on female rotor (screw compressor)")
    vanes: Optional[int] = Field(default=None, description="Number of vanes (centrifugal fan)")
    foundation_type: Optional[str] = Field(default=None, description="One of: 'Rigid', 'Flexible'")
    machine_group: Optional[str] = Field(default=None, description="One of: 'Group 1', 'Group 2', 'Group 3'")
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
            machine_type="Unknown",
            missing_fields=["GEMINI_API_KEY_MISSING"]
        )
        
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    You are VDX, an expert vibration analysis parsing assistant.
    Analyze the operator input and extract the machine parameters into the structured schema.
    If a parameter is not explicitly mentioned, DO NOT GUESS it. Leave it null/None.
    
    Expected machine type hint (if any): {expected_type}
    
    Operator Input:
    "{text}"
    
    Required fields for Screw Compressor: motor_rpm, male_lobes, female_lobes, foundation_type, machine_group
    Required fields for Centrifugal Fan: fan_rpm (mapped to motor_rpm), vanes, foundation_type, machine_group
    Required fields for Centrifugal Pump: Power rating in KW (can map to machine_group/foundation loosely or be ignored if unneeded by strict schema), motor_rpm, overall_vibration_rms, measured_peaks, and bearing type.
    
    If the user's input is just a greeting (e.g. "Hello"), or if they mention a machine (like a "centrifugal pump") but provide NO telemetry data, DO NOT just return missing fields. Instead, populate the `conversational_reply` field with a natural, helpful response asking them for the required information (like Power rating in KW, Speed in RPM, Vibration amplitude, peak frequencies, and bearing type).
    
    Otherwise, extract the data and determine if any required fields are missing based on the identified machine_type, adding them to missing_fields.
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
