// app/api/resume/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    // 1. Check environment
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({
        status: "error",
        step: "environment",
        error: "GROQ_API_KEY is not set in environment variables",
        groq_key_present: false,
      });
    }

    // 2. Validate input
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({
        status: "error",
        step: "input_validation",
        error: "Resume text is empty or invalid",
        text_length: text?.length || 0,
      });
    }

    // 3. Test Groq API directly
    const groq = new Groq({ apiKey: groqApiKey });

    const message = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Extract name and email from this text and return only JSON:
${text.slice(0, 500)}

Return: {"name": "...", "email": "..."}`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      max_tokens: 200,
      temperature: 0,
    });

    const groqResponse = message.choices[0]?.message?.content || "";

    // 4. Try to parse JSON from response
    let parsedJson = null;
    try {
      const jsonMatch = groqResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedJson = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Not critical, just report
    }

    return NextResponse.json({
      status: "success",
      step: "groq_api_test",
      groq_key_present: true,
      text_length: text.length,
      model_used: "llama-3.3-70b-versatile",
      groq_response: groqResponse,
      parsed_json: parsedJson,
      message: "Groq API is working. If you see garbage JSON above, the issue is Groq response format.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errorType = error instanceof Error ? error.name : typeof error;

    return NextResponse.json({
      status: "error",
      step: "groq_api_call",
      error_type: errorType,
      error: message,
      groq_key_present: !!process.env.GROQ_API_KEY,
      help:
        message.includes("401") || message.includes("Unauthorized")
          ? "GROQ_API_KEY is invalid or expired"
          : message.includes("429") || message.includes("Rate limit")
            ? "Groq API rate limit exceeded - wait a few minutes"
            : "Unknown Groq API error - check the error message above",
    });
  }
}