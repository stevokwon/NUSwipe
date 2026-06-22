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
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  skills: string[];
  targetRole: string | null;
  yearsExperience: string | null;
  gpa: string | null;
  availabilityDate: string | null;
  education: {
    degree: string | null;
    major: string | null;
    minor: string | null;
    university: string | null;
    graduationDate: string | null;
  };
}

/**
 * Extract structured data from resume text using Groq AI
 * Generic prompt that works with any resume format
 */
export async function extractFromResume(
  resumeText: string
): Promise<ExtractedResumeData | null> {
  try {
    // Validate input
    if (!resumeText || resumeText.trim().length === 0) {
      console.error("Resume text is empty");
      return null;
    }

    // Check API key
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY environment variable is not set");
      return null;
    }
    console.log(resumeText);
    const message = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `You are a resume parsing expert. Extract the following information from the resume text below. Return ONLY valid JSON with NO markdown, NO code blocks, NO extra text.

Resume:
${resumeText}

EXTRACTION INSTRUCTIONS:
- firstName: First name of the person
- lastName: Last name/family name of the person
- email: Email address in format xxx@xxx.xxx
- phone: Phone number with country code (e.g., +65, +852, +1)
- linkedinUrl: Full LinkedIn profile URL if present (format: https://linkedin.com/in/...)
- githubUrl: Full GitHub profile URL if present (format: https://github.com/...)
- websiteUrl: Portfolio or personal website URL if present
- skills: Array of all technical skills, programming languages, frameworks, and tools mentioned
- targetRole: Job title or role the person is seeking
- yearsExperience: Years of work experience. Return one of: "0", "<1", "1-2", "3-5", "5+"
- gpa: GPA or CAP score (e.g., 3.8/4.0 or 4.48/5.0)
- availabilityDate: Start date availability in YYYY-MM-DD format if mentioned
- education.degree: Degree type (Bachelor's, Master's, PhD, Diploma, Associate, etc.)
- education.major: Primary field of study
- education.minor: Secondary field of study or minor if mentioned
- education.university: University or institution name
- education.graduationDate: Expected or actual graduation date (Month Year format, e.g., May 2027)

Return this JSON structure with null for any missing fields:
{
  "firstName": null,
  "lastName": null,
  "email": null,
  "phone": null,
  "linkedinUrl": null,
  "githubUrl": null,
  "websiteUrl": null,
  "skills": [],
  "targetRole": null,
  "yearsExperience": null,
  "gpa": null,
  "availabilityDate": null,
  "education": {
    "degree": null,
    "major": null,
    "minor": null,
    "university": null,
    "graduationDate": null
  }
}`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      max_tokens: 2048,
      temperature: 0,
    });

    // Extract text from response
    const content = message.choices[0]?.message?.content;
    if (!content) {
      console.error("Invalid response from Groq: empty content");
      return null;
    }

    console.log("Groq raw response:", content.slice(0, 500));

    // Find JSON in response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Groq response");
      return null;
    }

    const extracted: ExtractedResumeData = JSON.parse(jsonMatch[0]);
    console.log("Parsed extraction:", {
      name: `${extracted.firstName} ${extracted.lastName}`,
      email: extracted.email,
      linkedinUrl: extracted.linkedinUrl,
      githubUrl: extracted.githubUrl,
      skillCount: extracted.skills.length,
      gpa: extracted.gpa,
      minor: extracted.education.minor,
    });
    
    return extracted;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Resume parsing error:", message);
    return null;
  }
}