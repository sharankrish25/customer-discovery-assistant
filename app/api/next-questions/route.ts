import { NextResponse } from "next/server";

const RESPONSE = {
  ok: false as const,
  error: {
    code: "FEATURE_REMOVED" as const,
    message:
      "Automatic follow-up question generation has been removed from the assistant and is no longer available.",
  },
};

export async function POST() {
  return NextResponse.json(RESPONSE, { status: 410 });
}
