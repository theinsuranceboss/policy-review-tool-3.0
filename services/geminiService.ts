
import { GoogleGenAI, Type } from "@google/genai";
import { PolicyAnalysis } from "../types";

/**
 * Calculates a SHA-256 hash of the file content for duplicate detection.
 */
export const calculateFileHash = async (base64: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(base64);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Deep scan of insurance policy using Gemini 3 Pro.
 * Uses process.env.API_KEY exclusively as required.
 */
export const analyzePolicy = async (file: File, signal?: AbortSignal): Promise<PolicyAnalysis> => {
  // Directly using process.env.API_KEY as injected by the build tool
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("Boss, the API Key is missing. Check Vercel environment variables.");
  }

  // Check for early abort
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const ai = new GoogleGenAI({ apiKey });
  
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const fileHash = await calculateFileHash(base64Data);

  const prompt = `You are "The Insurance Boss", the world's most aggressive and accurate insurance auditor. 
  Perform a DEEP technical audit of this policy PDF. Identify traps, hidden exclusions, and gaps in coverage.
  Extract:
  1. Insured details (Name, Address, FEIN, Policy #).
  2. Limits (General Liability, Work Comp, etc).
  3. Industry specific exclusions (e.g., "Injury to Subcontractors", "Residential Exclusion").
  4. A score (0-10) based on coverage robustness.
  5. 3 specific Red Flags.
  6. 3 specific Strengths.
  7. 3 expert Recommendations.
  
  Return ONLY a valid JSON object matching the requested schema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
          { text: prompt }
        ]
      },
      config: {
        // High quality reasoning for technical audits
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insuredName: { type: Type.STRING },
            insuredAddress: { type: Type.STRING },
            policyNumber: { type: Type.STRING },
            fein: { type: Type.STRING },
            industry: { type: Type.STRING },
            effectiveDate: { type: Type.STRING },
            expirationDate: { type: Type.STRING },
            type: { type: Type.STRING },
            rating: { type: Type.STRING, description: "Good, Needs Improvement, or Poor" },
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            coverageAnalysis: { type: Type.STRING },
            premiumVsValue: { type: Type.STRING },
            deductibles: { type: Type.STRING },
            foundExclusions: { type: Type.ARRAY, items: { type: Type.STRING } },
            industryExclusionAudit: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            coverageLimits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  limit: { type: Type.STRING }
                }
              }
            }
          },
          required: ["insuredName", "score", "summary", "redFlags"]
        }
      }
    });

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const result = JSON.parse(response.text || '{}');
    return {
      id: Math.random().toString(36).substr(2, 9),
      filename: file.name,
      uploadDate: new Date().toLocaleString(),
      fileHash,
      fileData: base64Data,
      ...result
    };
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    console.error("Boss, Audit Failed:", error);
    throw new Error(error.message || "Audit engine failed to respond.");
  }
};
