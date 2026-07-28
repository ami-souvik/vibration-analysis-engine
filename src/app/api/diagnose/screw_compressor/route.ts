import { NextResponse } from "next/server";
import { diagnoseScrewCompressor } from "@/lib/engine/screwCompressor";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = diagnoseScrewCompressor({
      motor_rpm: body.motor_rpm,
      male_lobes: body.male_lobes,
      female_lobes: body.female_lobes,
      foundation_type: body.foundation_type,
      machine_group: body.machine_group,
      measured_peaks: body.measured_peaks || {},
      overall_vibration_rms: body.overall_vibration_rms,
      bearing_numbers: body.bearing_numbers,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
