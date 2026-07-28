import { NextResponse } from "next/server";
import { calculateSpectrumFaults } from "@/lib/engine/spectrum";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const faults = calculateSpectrumFaults({
      shaft_rpm: body.shaft_rpm || body.fan_rpm || 2980,
      vanes: body.vanes || 11,
      balls: body.balls || 16,
      ball_diameter: body.ball_diameter || 20.0,
      pitch_diameter: body.pitch_diameter || 110.0,
      contact_angle: body.contact_angle || 12.0,
    });

    return NextResponse.json({ faults });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
