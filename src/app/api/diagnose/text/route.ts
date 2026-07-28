import { NextResponse } from "next/server";
import { parseOperatorInput } from "@/lib/nlu/parser";
import { diagnoseScrewCompressor } from "@/lib/engine/screwCompressor";
import { generateDiagnosisNarration } from "@/lib/nlu/narrator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, expected_type } = body;

    const params = await parseOperatorInput(text, expected_type);

    if (params.conversational_reply) {
      return NextResponse.json({ status: "conversation", reply: params.conversational_reply });
    }

    if (params.missing_fields && params.missing_fields.length > 0) {
      return NextResponse.json({ status: "missing_fields", missing: params.missing_fields, params });
    }

    const peaksDict: Record<string, number> = {};
    if (params.measured_peaks) {
      for (const p of params.measured_peaks) {
        peaksDict[p.name] = p.frequency_hz;
      }
    }

    const result = diagnoseScrewCompressor({
      motor_rpm: params.motor_rpm || 0,
      male_lobes: params.male_lobes || 0,
      female_lobes: params.female_lobes || 0,
      foundation_type: params.foundation_type || "Rigid",
      machine_group: params.machine_group || "Group 1",
      measured_peaks: peaksDict,
      overall_vibration_rms: params.overall_vibration_rms,
      bearing_numbers: params.bearing_numbers,
    });

    const narration = generateDiagnosisNarration(result, text, params);
    return NextResponse.json({ status: "success", result, narration, params });
  } catch (error) {
    return NextResponse.json(
      { status: "error", detail: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
