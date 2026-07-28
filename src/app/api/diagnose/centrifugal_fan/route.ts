import { NextResponse } from "next/server";
import { diagnoseCentrifugalFan } from "@/lib/engine/centrifugalFan";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = diagnoseCentrifugalFan({
      fan_rpm: body.fan_rpm,
      vanes: body.vanes,
      foundation_type: body.foundation_type,
      machine_group: body.machine_group,
      measured_peaks: body.measured_peaks || {},
      overall_vibration_rms: body.overall_vibration_rms,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
