import { NextResponse } from "next/server";
import { calculateSpectrumFaults } from "@/lib/engine/spectrum";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const faults = calculateSpectrumFaults({
      shaft_rpm: body.shaft_rpm,
      balls: body.balls,
      ball_diameter: body.ball_diameter,
      pitch_diameter: body.pitch_diameter,
      contact_angle: body.contact_angle,
    });

    return NextResponse.json({ faults });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
