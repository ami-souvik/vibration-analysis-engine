import { NextResponse } from "next/server";
import { BEARING_DB } from "@/lib/engine/spectrum";

export async function GET(
  request: Request,
  { params }: { params: { bearing_number: string } }
) {
  try {
    const bearingNumber = params.bearing_number;
    const cleanReq = bearingNumber.replace(/\s+/g, "").toUpperCase();

    for (const [key, geom] of Object.entries(BEARING_DB)) {
      if (key.replace(/\s+/g, "").toUpperCase() === cleanReq) {
        return NextResponse.json(geom);
      }
    }

    return NextResponse.json({ detail: "Bearing not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
