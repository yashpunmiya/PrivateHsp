import { NextResponse } from "next/server";
import { analyzeSeries } from "@/lib/services";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try { return NextResponse.json(analyzeSeries(await request.json())); }
  catch (error) { return NextResponse.json({ error: error instanceof ZodError ? "invalid_request" : "analysis_failed" }, { status: error instanceof ZodError ? 400 : 500 }); }
}
