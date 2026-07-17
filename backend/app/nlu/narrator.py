import os
from google import genai
from google.genai import types
from app.engine.models import DiagnosticResult

def generate_diagnosis_narration(result: DiagnosticResult, operator_input: str) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # Fallback if no API key is provided
        verdict = result.acceptance_verdict
        faults = ", ".join([f.fault_condition for f in result.matched_faults]) if result.matched_faults else "None"
        return f"Calculations complete. Machine: {result.machine_type}. Verdict: {verdict}. Detected Faults: {faults}."
        
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    You are an expert vibration analysis narrator for a diagnostic console.
    
    The deterministic calculation engine has processed the operator's input and computed the following results. 
    YOUR JOB IS ONLY TO NARRATE THESE EXACT RESULTS. DO NOT CALCULATE OR INFER ANY NEW NUMBERS OR FREQUENCIES. 
    Use the numbers provided in the 'Diagnostic Result' strictly.
    
    Operator Input:
    "{operator_input}"
    
    Diagnostic Result from Engine:
    Machine Type: {result.machine_type}
    Acceptance Verdict: {result.acceptance_verdict}
    Matched Faults: {[f.model_dump() for f in result.matched_faults]}
    Calculated Frequencies: {[f.model_dump() for f in result.calculated_frequencies]}
    
    Write a clear, professional, and concise human-readable diagnostic report for the operator in a terminal-style tone.
    Be authoritative and direct. 
    
    Format the response strictly with the following markdown structure, adapting the content to the specific machine type and results:
    
    Thank you for the complete information.
    
    * [Key mathematical deductions, e.g., Male Rotor Speed (1x Male Speed): X Hz or Rotor Mesh Frequency (RMF): X Hz]
    * Bearing Type Determination / Bearing Frequencies: [Any relevant bearing info or BPFI/BPFO calculations]

    Vibration Analysis:
    * Standard Limit (e.g., VDI 3836 Group): [Explain the provided overall RMS value against the acceptance verdict and limit]
    * Peak Frequency Analysis: [List the observed peaks, their harmonic ratios, and what fault type they indicate]

    Preliminary Diagnosis:
    * Severity: [Overall severity based on amplitude and harmonics]
    * Fault: [The primary fault(s) detected]
    * Action: [Actionable recommendations]
    """
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.0
        ),
    )
    
    return response.text
