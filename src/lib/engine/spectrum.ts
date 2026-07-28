import { BearingGeometry, FaultFrequencyResult } from "./models";

export const BEARING_DB: Record<string, BearingGeometry> = {
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
    balls: 10,
    ball_diameter: 15.0,
    pitch_diameter: 75.0,
    contact_angle: 0.0,
  };
}

export function calculateSpectrumFaults(params: {
  shaft_rpm: number;
  balls: number;
  ball_diameter: number;
  pitch_diameter: number;
  contact_angle: number;
}): FaultFrequencyResult[] {
  const { shaft_rpm, balls, ball_diameter, pitch_diameter, contact_angle } = params;

  const fs = shaft_rpm / 60.0;
  if (fs === 0 || pitch_diameter === 0) {
    return [];
  }

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
    { label: "Shaft (1x)", frequency_hz: Number(fs.toFixed(2)), ratio: "1.00x", description: "Reference - running speed" },
    { label: "FTF - Fundamental Train Frequency", frequency_hz: Number(ftf.toFixed(2)), ratio: `${(ftf / fs).toFixed(2)}x`, description: "Cage defect" },
    { label: "BPFO - Ball Pass Outer Race", frequency_hz: Number(bpfo.toFixed(2)), ratio: `${(bpfo / fs).toFixed(2)}x`, description: "Outer race defect" },
    { label: "BPFI - Ball Pass Inner Race", frequency_hz: Number(bpfi.toFixed(2)), ratio: `${(bpfi / fs).toFixed(2)}x`, description: "Inner race defect" },
    { label: "BSF - Ball Spin Frequency", frequency_hz: Number(bsf.toFixed(2)), ratio: `${(bsf / fs).toFixed(2)}x`, description: "Rolling element defect" },
  ];
}
