import { NextResponse } from "next/server";

const RESPONSE = {
  ok: false as const,
  error: {
    code: "FEATURE_REMOVED" as const,
    message:
      "Follow-up email editing is no longer supported. The optional workflow has been removed from the assistant.",
  },
};

export async function POST() {
  return NextResponse.json(RESPONSE, { status: 410 });
}
