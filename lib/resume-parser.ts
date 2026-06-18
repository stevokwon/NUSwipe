// lib/resume-parser.ts
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ExtractedResumeData {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  targetRole: string | null;
  yearsExperience: string | null;
  education: {
    degree: string | null;
    major: string | null;
    university: string | null;
    graduationDate: string | null;
  };
}

/**
 * Extract structured data from resume text using Groq AI
 * Uses free-tier Mixtral 8x7B model for best performance
 */
export async function extractFromResume(
  resumeText: string
): Promise<ExtractedResumeData | null> {
  try {
    const message = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Extract the following information from this resume and return ONLY valid JSON (no markdown, no extra text, no commentary):

Resume Text:
${resumeText}

Return ONLY this JSON format with no other text:
{
  "firstName": "string or null",
  "lastName": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "skills": ["skill1", "skill2"],
  "targetRole": "string or null",
  "yearsExperience": "0 or <1 or 1-2 or 3-5 or 5+ or null",
  "education": {
    "degree": "Bachelor's or Master's or PhD or Diploma or null",
    "major": "string or null",
    "university": "string or null",
    "graduationDate": "May 2025 or null"
  }
}`,
        },
      ],
      model: "mixtral-8x7b-32768", // Free tier, fastest, best quality
      max_tokens: 1024,
      temperature: 0, // More consistent output for JSON
    });

    // Extract text from response
    const content = message.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Invalid response from Groq");
    }

    // Find JSON in response (sometimes model adds extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Groq response");
    }

    const extracted: ExtractedResumeData = JSON.parse(jsonMatch[0]);
    return extracted;
  } catch (error) {
    console.error("Resume parsing error:", error);
    return null;
  }
}