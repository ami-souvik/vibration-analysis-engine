export interface FaultFrequency {
  label: string;
  frequency_hz: number;
  frequency_cpm?: number;
  description: string;
  directional_trait?: string;
  dominant_location?: string;
}

export interface MatchedPeak {
  measured_frequency_hz: number;
  calculated_frequency_hz: number;
  fault_condition: string;
  confidence: number; // percentage
  directional_trait?: string;
}

export interface DiagnosticResult {
  machine_type: string;
  calculated_frequencies: FaultFrequency[];
  acceptance_verdict: string;
  iso_zone?: string;
  acceptance_limit_rms: number | null;
  matched_faults: MatchedPeak[];
}

export interface BearingGeometry {
  bearing_number: string;
  balls: number;
  ball_diameter: number;
  pitch_diameter: number;
  contact_angle: number;
}

export interface FaultFrequencyResult {
  label: string;
  frequency_hz: number;
  frequency_cpm?: number;
  ratio: string;
  description: string;
  directional_trait?: string;
}

export interface ExtractedPeak {
  name: string;
  frequency_hz: number;
}

export interface ExtractedMachineParams {
  fan_rpm?: number | null;
  motor_rpm?: number | null;
  vanes?: number | null;
  male_lobes?: number | null;
  female_lobes?: number | null;
  foundation_type?: string | null;
  machine_group?: string | null;
  bearing_numbers?: string[] | null;
  measured_peaks?: ExtractedPeak[] | null;
  overall_vibration_rms?: number | null;
  missing_fields: string[];
  conversational_reply?: string | null;
}

