import { BearingGeometry, FaultFrequencyResult } from "./models";

export const BEARING_DB: Record<string, BearingGeometry> = {
  "22216": { bearing_number: "22216", balls: 16, ball_diameter: 22.0, pitch_diameter: 110.0, contact_angle: 12.0 },
  "22220": { bearing_number: "22220", balls: 18, ball_diameter: 26.0, pitch_diameter: 140.0, contact_angle: 12.0 },
  "22316": { bearing_number: "22316", balls: 14, ball_diameter: 30.0, pitch_diameter: 125.0, contact_angle: 14.0 },
  "23024": { bearing_number: "23024", balls: 20, ball_diameter: 22.0, pitch_diameter: 150.0, contact_angle: 10.0 },
  "7309": { bearing_number: "7309", balls: 10, ball_diameter: 15.88, pitch_diameter: 72.5, contact_angle: 40.0 },
  "NU 309": { bearing_number: "NU 309", balls: 13, ball_diameter: 16.0, pitch_diameter: 80.0, contact_angle: 0.0 },
  "6310": { bearing_number: "6310", balls: 8, ball_diameter: 19.05, pitch_diameter: 80.0, contact_angle: 0.0 },
  "6309": { bearing_number: "6309", balls: 8, ball_diameter: 17.46, pitch_diameter: 72.5, contact_angle: 0.0 },
  "6308": { bearing_number: "6308", balls: 8, ball_diameter: 15.08, pitch_diameter: 65.0, contact_angle: 0.0 },
  "3387": { bearing_number: "3387", balls: 12, ball_diameter: 10.0, pitch_diameter: 80.0, contact_angle: 0.0 },
  "7307": { bearing_number: "7307", balls: 10, ball_diameter: 12.7, pitch_diameter: 58.5, contact_angle: 40.0 },
  "NU 307": { bearing_number: "NU 307", balls: 13, ball_diameter: 12.0, pitch_diameter: 62.5, contact_angle: 0.0 },
};

export function getOrEstimateBearingGeometry(bearingName: string): BearingGeometry {
  const cleanName = bearingName.toUpperCase().replace(/DE/g, "").replace(/NDE/g, "").trim();

  for (const [key, geom] of Object.entries(BEARING_DB)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return geom;
    }
  }

  return {
    bearing_number: bearingName,
    balls: 16,
    ball_diameter: 20.0,
    pitch_diameter: 110.0,
    contact_angle: 12.0,
  };
}

export function calculateSpectrumFaults(params: {
  shaft_rpm: number;
  balls: number;
  ball_diameter: number;
  pitch_diameter: number;
  contact_angle: number;
  vanes?: number;
  male_lobes?: number;
  female_lobes?: number;
}): FaultFrequencyResult[] {
  const { shaft_rpm, balls, ball_diameter, pitch_diameter, contact_angle, vanes = 11 } = params;

  const fs = shaft_rpm / 60.0;
  if (fs === 0 || pitch_diameter === 0) {
    return [];
  }

  const bpfHz = vanes * fs;
  const twoBpfHz = 2 * bpfHz;
  const stallMidHz = 0.705 * fs;
  const surgeMidHz = 0.415 * fs;

  const angleRad = (contact_angle * Math.PI) / 180.0;
  const cosAngle = Math.cos(angleRad);

  const ftf = (fs / 2.0) * (1.0 - (ball_diameter / pitch_diameter) * cosAngle);
  const bpfo = balls * ftf;
  const bpfi = (balls * fs / 2.0) * (1.0 + (ball_diameter / pitch_diameter) * cosAngle);
  const bsf =
    (pitch_diameter / (2.0 * ball_diameter)) *
    fs *
    (1.0 - Math.pow((ball_diameter / pitch_diameter) * cosAngle, 2));

  return [
    { label: "1x Shaft Speed", frequency_hz: Number(fs.toFixed(2)), frequency_cpm: Math.round(fs * 60), ratio: "1.00x", description: "Fan rotor running speed - Impeller Unbalance", directional_trait: "Purely Radial" },
    { label: "2x Shaft Speed", frequency_hz: Number((2 * fs).toFixed(2)), frequency_cpm: Math.round(2 * fs * 60), ratio: "2.00x", description: "Coupling Misalignment / Bent Shaft", directional_trait: "Strongly Axial" },
    { label: "Aerodynamic Stall Band", frequency_hz: Number(stallMidHz.toFixed(2)), frequency_cpm: Math.round(stallMidHz * 60), ratio: "0.66x - 0.75x", description: "Aerodynamic Stall (Blade Flow Separation)", directional_trait: "Fluctuating Radial" },
    { label: "Aerodynamic Surge Band", frequency_hz: Number(surgeMidHz.toFixed(2)), frequency_cpm: Math.round(surgeMidHz * 60), ratio: "0.33x - 0.50x", description: "Aerodynamic Surge (System Flow Reversal)", directional_trait: "Severe Axial/Radial" },
    { label: "Blade Pass Frequency (1x BPF)", frequency_hz: Number(bpfHz.toFixed(2)), frequency_cpm: Math.round(bpfHz * 60), ratio: `${vanes}.00x`, description: "Flow Obstruction / Inlet Cone Misalignment", directional_trait: "Radial & Axial" },
    { label: "2x Blade Pass Frequency (2x BPF)", frequency_hz: Number(twoBpfHz.toFixed(2)), frequency_cpm: Math.round(twoBpfHz * 60), ratio: `${2 * vanes}.00x`, description: "Harmonic Blade Pass Anomaly", directional_trait: "Radial & Axial" },
    { label: "FTF - Fundamental Train Frequency", frequency_hz: Number(ftf.toFixed(2)), frequency_cpm: Math.round(ftf * 60), ratio: `${(ftf / fs).toFixed(2)}x`, description: "Cage Defect", directional_trait: "Radial" },
    { label: "BPFO - Ball Pass Outer Race", frequency_hz: Number(bpfo.toFixed(2)), frequency_cpm: Math.round(bpfo * 60), ratio: `${(bpfo / fs).toFixed(2)}x`, description: "Outer Race Defect", directional_trait: "Radial" },
    { label: "BPFI - Ball Pass Inner Race", frequency_hz: Number(bpfi.toFixed(2)), frequency_cpm: Math.round(bpfi * 60), ratio: `${(bpfi / fs).toFixed(2)}x`, description: "Inner Race Defect", directional_trait: "Radial" },
    { label: "BSF - Ball Spin Frequency", frequency_hz: Number(bsf.toFixed(2)), frequency_cpm: Math.round(bsf * 60), ratio: `${(bsf / fs).toFixed(2)}x`, description: "Roller Spin Defect", directional_trait: "Radial" },
  ];
}

