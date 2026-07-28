import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedMachineParams } from "../engine/models";

export async function parseOperatorInput(
  text: string,
  _expectedType?: string
): Promise<ExtractedMachineParams> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      missing_fields: ["GEMINI_API_KEY_MISSING"],
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
=== PERSONA & ROLE ===
You are VDX · Diagnostic Engine, an expert NLU parser for rotating machinery and centrifugal fan vibration diagnostics.
Your job is to analyze the operator's input text (which may span single or multiple conversation turns) and extract telemetry parameters into the structured schema.

=== SMART INTAKE RULE ===
Check if the operator input contains ALL required diagnostic telemetry fields:
1. Speed in RPM (\`fan_rpm\` or \`motor_rpm\`)
2. Impeller vanes count (\`vanes\`)
3. Foundation type: Rigid or Flexible (\`foundation_type\`)
4. Machine Group / Classification according to ISO 20816-3: Group 1 (Large Machines > 300 kW) or Group 2 (Medium Machines 15-300 kW) (\`machine_group\`)
5. Bearing designation / numbers (\`bearing_numbers\`, e.g. Spherical roller bearings, 22216, 6310)
6. Overall vibration in mm/s RMS (\`overall_vibration_rms\`)
7. Measured peak frequencies in Hz (\`measured_peaks\`)

- If ALL required fields are present: extract them cleanly and leave \`missing_fields\` empty and \`conversational_reply\` null.
- If ANY required fields are missing and NO telemetry data is provided (e.g. user just says "Hello" or asks a general question): populate \`conversational_reply\` with a natural greeting asking specifically for the missing items.
- If SOME fields are present but SOME are missing: extract all provided fields into the schema and list ONLY the unprovided items in \`missing_fields\`.

=== EXTRACTION RULES & HINTS ===
- Machine Group Mapping:
  - "Group 1" or "Large" or "> 300 kW" -> "Group 1 (Large Machines > 300 kW)"
  - "Group 2" or "Medium" or "15-300 kW" -> "Group 2 (Medium Machines 15-300 kW)"
- Speed: Look for values followed by "RPM" or "speed" (e.g., 2980 RPM -> fan_rpm: 2980).
- Vanes: Look for "vanes" or "impeller vanes" (e.g., "11 vanes" -> vanes: 11).
- Bearings: Extract bearing model designations such as "Spherical roller bearings", "22216", "6310", etc.
- Foundation: Identify "Rigid" or "Flexible".
- Peaks: Extract all frequency numbers given in Hz or CPM (convert CPM to Hz if explicitly in CPM: Hz = CPM / 60) into \`measured_peaks\`.
- Strict Rule: DO NOT guess or infer values not mentioned in the input.

Operator Input History:
"${text}"
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fan_rpm: { type: Type.NUMBER, description: "Fan running speed in RPM", nullable: true },
            motor_rpm: { type: Type.NUMBER, description: "Motor/Fan running speed in RPM", nullable: true },
            vanes: { type: Type.INTEGER, description: "Number of impeller vanes", nullable: true },
            foundation_type: { type: Type.STRING, description: "One of: 'Rigid', 'Flexible'", nullable: true },
            machine_group: {
              type: Type.STRING,
              description: "One of: 'Group 1 (Large Machines > 300 kW)', 'Group 2 (Medium Machines 15-300 kW)'",
              nullable: true,
            },
            bearing_numbers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of bearing designations, e.g. ['Spherical roller bearings', '22216']",
              nullable: true,
            },
            measured_peaks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  frequency_hz: { type: Type.NUMBER },
                },
                required: ["name", "frequency_hz"],
              },
              description: "List of measured peaks with their frequencies in Hz",
              nullable: true,
            },
            overall_vibration_rms: { type: Type.NUMBER, description: "Overall vibration in mm/s RMS", nullable: true },
            missing_fields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of required fields missing from input",
            },
            conversational_reply: {
              type: Type.STRING,
              description: "Natural reply or clarification response if telemetry is incomplete or conversational",
              nullable: true,
            },
          },
          required: ["missing_fields"],
        },
        temperature: 0.0,
      },
    });

    const parsed: ExtractedMachineParams = JSON.parse(response.text || "{}");
    if (!parsed.missing_fields) {
      parsed.missing_fields = [];
    }
    // Normalize fan_rpm and motor_rpm
    if (parsed.fan_rpm && !parsed.motor_rpm) {
      parsed.motor_rpm = parsed.fan_rpm;
    } else if (parsed.motor_rpm && !parsed.fan_rpm) {
      parsed.fan_rpm = parsed.motor_rpm;
    }
    return parsed;
  } catch (error) {
    console.error("Gemini parse error:", error);
    return {
      missing_fields: ["PARSER_ERROR"],
      conversational_reply: `An error occurred while parsing input: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
