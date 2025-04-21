import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

// Define the schema using Zod
const AnalysisResultSchema = z.object({
    summary: z.string().min(50).max(500),
    keywordMatch: z.object({
        score: z.number().min(0).max(100),
        matchedKeywords: z.array(z.string()),
        missingKeywords: z.array(z.string()),
        importanceWeights: z
            .array(
                z.object({
                    keyword: z.string(),
                    importance: z.number().min(1).max(10),
                })
            )
            .optional(),
    }),
    strengths: z.array(z.string().min(10)),
    improvements: z.array(z.string().min(10)),
    suggestions: z.array(
        z.object({
            section: z.string(),
            content: z.string().min(20),
            priority: z.number().min(1).max(5).optional(),
        })
    ),
});

// Export the type derived from the schema
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// Create a fallback result that conforms to the schema
const createFallbackResult = (): AnalysisResult => ({
    summary:
        "We couldn't analyze your CV at this time. Please try again later. This might be due to server load or connectivity issues.",
    keywordMatch: {
        score: 0,
        matchedKeywords: [],
        missingKeywords: [],
    },
    strengths: ["Your document was successfully uploaded"],
    improvements: [
        "Unable to analyze CV. Please try again or contact support if the issue persists.",
    ],
    suggestions: [
        {
            section: "General",
            content:
                "Please try uploading your CV again or use a different format if the issue persists.",
        },
    ],
});

/**
 * Analyzes a CV against a job description using AI
 * @param pdfUrl - URL to the PDF CV
 * @param jobDescription - The job description to compare against
 * @returns Analysis results
 */
export async function analyzeCvWithJobDescription(
    pdfUrl: string,
    jobDescription: string
): Promise<AnalysisResult> {
    try {
        // Using Google Gemini provider for CV analysis
        const google = createGoogleGenerativeAI({
            apiKey: process.env.GEMINI_API_KEY
        });

        // Create the full URL for the PDF
        const fullPdfUrl = new URL(pdfUrl, window.location.origin).toString();

        const { object } = await generateObject({
            model: google("gemini-2.0-flash-001"),
            schema: AnalysisResultSchema,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `
                    You are an expert CV/resume analyzer, talent acquisition specialist, and career coach with 15+ years of experience in technical recruiting for top companies.
                    Analyze this CV against the job description and provide detailed, specific and immediately actionable feedback that will help the candidate improve their chances of getting this job.
                    
                    ## Analysis Instructions:
                    1. KEYWORD MATCH SCORE CALCULATION:
                       - Extract 10-15 essential keywords/skills/technologies from the job description
                       - Assign importance weights (1-10) to each keyword based on their prominence, repetition, and strategic importance
                       - Check if each keyword appears in the CV (consider both exact matches and semantic equivalents)
                       - For technical skills, verify the depth of experience (years, projects, complexity level)
                       - Calculate match score as a percentage based on weighted matches
                       - Provide both matched and missing keywords with their importance weights
                    
                    2. STRENGTHS:
                       - Identify 3-5 specific strengths from the CV that directly align with the core job requirements
                       - Focus on quantifiable achievements, technical expertise, and relevant experience
                       - Highlight competitive advantages the candidate has over typical applicants
                       - Note any unique qualifications that address specific job challenges mentioned
                    
                    3. IMPROVEMENTS:
                       - Identify 3-5 specific, high-impact improvements needed based on gaps between CV and job requirements
                       - Provide concrete, actionable feedback that can be implemented immediately
                       - Focus on critical missing skills, experiences, or qualifications that would significantly improve the match
                       - Suggest specific phrasing or content to add for each improvement
                    
                    4. SUGGESTIONS:
                       - Provide section-specific recommendations targeting each major CV component
                       - Include priority level for each suggestion (1-5, with 5 being highest priority)
                       - Be precise with actionable recommendations including specific wording examples
                       - Suggest strategic reorganization to highlight most relevant experiences/skills first
                       - Recommend removing or de-emphasizing irrelevant content
                    
                    5. SUMMARY:
                       - Provide a concise overall assessment of the candidate's fit for this specific role
                       - Include an objective statement about strengths vs. gaps
                       - Estimate interview potential (strong candidate, needs some improvements, significant gaps)
                       - Address the candidate by name and maintain an encouraging but realistic tone
                    
                    ## CV Analysis Best Practices:
                    - Analyze both content AND formatting/presentation
                    - Consider industry standards for the specific role
                    - Evaluate how recent and relevant the experience is
                    - Assess technology stack alignment with job requirements
                    - Look for evidence of achievements rather than just responsibilities
                    - Consider career progression and growth trajectory
                    
                    Job Description:
                    ${jobDescription}
                    `,
                        },
                        {
                            type: "image",
                            image: fullPdfUrl,
                        },
                    ],
                },
            ],
        });
        return object;
    } catch (error) {
        console.error("Error analyzing CV:", error);

        // Return a fallback response that conforms to the schema
        return createFallbackResult();
    }
}
