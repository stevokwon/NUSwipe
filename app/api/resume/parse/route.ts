// app/api/resume/parse/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractFromResume } from "@/lib/resume-parser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    // Validate input
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Resume text is required and must be a string" },
        { status: 400 }
      );
    }

    if (text.trim().length < 50) {
      return NextResponse.json(
        { error: "Resume text is too short. Ensure PDF extraction worked." },
        { status: 400 }
      );
    }

    // Check env var
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not set");
      return NextResponse.json(
        { error: "Server configuration error: GROQ_API_KEY not set" },
        { status: 500 }
      );
    }

    // Parse the resume
    const extracted = await extractFromResume(text);

    if (!extracted) {
      return NextResponse.json(
        { error: "Failed to parse resume content" },
        { status: 400 }
      );
    }

    return NextResponse.json(extracted);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Resume parse endpoint error:", message);
    return NextResponse.json(
      { error: `Resume parsing failed: ${message}` },
      { status: 500 }
    );
  }
}