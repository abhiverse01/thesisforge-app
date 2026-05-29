import { NextResponse } from "next/server";

/**
 * Health check endpoint — returns server status and build info.
 * Used by monitoring and load balancers to verify service availability.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "thesisforge",
    timestamp: new Date().toISOString(),
  });
}
