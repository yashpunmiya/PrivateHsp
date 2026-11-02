import { NextResponse } from "next/server";
import { createResearchBrief } from "@/lib/services";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try { return NextResponse.json(createResearchBrief(await request.json())); }
  catch (error) { return NextResponse.json({ error: error instanceof ZodError ? "invalid_request" : "brief_failed" }, { status: error instanceof ZodError ? 400 : 500 }); }
}
