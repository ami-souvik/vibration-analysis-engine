import os
from dotenv import load_dotenv

# Try to load .env from the parent directory (project root) or current directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env'))
load_dotenv() # Fallback to local backend/.env if it exists

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, List
from app.engine.screw_compressor import diagnose_screw_compressor
from app.engine.centrifugal_fan import diagnose_centrifugal_fan
from app.nlu.parser import parse_operator_input
from app.nlu.narrator import generate_diagnosis_narration

app = FastAPI(title="VDX Diagnostic Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production to match your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScrewCompressorRequest(BaseModel):
    motor_rpm: float
    male_lobes: int
    female_lobes: int
    foundation_type: str
    machine_group: str
    measured_peaks: Dict[str, float]
    overall_vibration_rms: Optional[float] = None

class CentrifugalFanRequest(BaseModel):
    fan_rpm: float
    vanes: int
    foundation_type: str
    machine_group: str
    measured_peaks: Dict[str, float]
    overall_vibration_rms: Optional[float] = None

@app.post("/api/diagnose/screw_compressor")
def diagnose_sc(req: ScrewCompressorRequest):
    result = diagnose_screw_compressor(
        motor_rpm=req.motor_rpm,
        male_lobes=req.male_lobes,
        female_lobes=req.female_lobes,
        foundation_type=req.foundation_type,
        machine_group=req.machine_group,
        measured_peaks=req.measured_peaks,
        overall_vibration_rms=req.overall_vibration_rms
    )
    return result

@app.post("/api/diagnose/centrifugal_fan")
def diagnose_cf(req: CentrifugalFanRequest):
    result = diagnose_centrifugal_fan(
        fan_rpm=req.fan_rpm,
        vanes=req.vanes,
        foundation_type=req.foundation_type,
        machine_group=req.machine_group,
        measured_peaks=req.measured_peaks,
        overall_vibration_rms=req.overall_vibration_rms
    )
    return result

class TextDiagnoseRequest(BaseModel):
    text: str
    expected_type: Optional[str] = None

@app.post("/api/diagnose/text")
def diagnose_from_text(req: TextDiagnoseRequest):
    params = parse_operator_input(req.text, req.expected_type)
    
    if not params.machine_type and "machine_type" not in params.missing_fields:
        params.missing_fields.append("machine_type")
        
    if params.missing_fields:
        return {"status": "missing_fields", "missing": params.missing_fields, "params": params.model_dump()}
        
    # Convert list of ExtractedPeak back to dictionary for the engines
    peaks_dict = {p.name: p.frequency_hz for p in params.measured_peaks} if params.measured_peaks else {}
        
    if params.machine_type == "Screw Compressor":
        result = diagnose_screw_compressor(
            motor_rpm=params.motor_rpm,
            male_lobes=params.male_lobes,
            female_lobes=params.female_lobes,
            foundation_type=params.foundation_type,
            machine_group=params.machine_group,
            measured_peaks=peaks_dict,
            overall_vibration_rms=params.overall_vibration_rms
        )
        narration = generate_diagnosis_narration(result, req.text)
        return {"status": "success", "result": result.model_dump(), "narration": narration, "params": params.model_dump()}
    elif params.machine_type == "Centrifugal Fan":
        result = diagnose_centrifugal_fan(
            fan_rpm=params.motor_rpm,
            vanes=params.vanes,
            foundation_type=params.foundation_type,
            machine_group=params.machine_group,
            measured_peaks=peaks_dict,
            overall_vibration_rms=params.overall_vibration_rms
        )
        narration = generate_diagnosis_narration(result, req.text)
        return {"status": "success", "result": result.model_dump(), "narration": narration, "params": params.model_dump()}
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported or unknown machine type: {params.machine_type}")
