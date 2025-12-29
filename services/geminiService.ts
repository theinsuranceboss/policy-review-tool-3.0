
import { GoogleGenAI, Type } from "@google/genai";
import { PolicyAnalysis } from "../types";

/**
 * Calculates a SHA-256 hash of the file content for duplicate detection.
 * This allows the "Smart Vault" to identify if a policy has already been audited.
 */
export const calculateFileHash = async (base64: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(base64);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Deep scan of insurance policy using Gemini 3 Pro.
 * Strictly uses process.env.API_KEY as per requirements.
 */
export const analyzePolicy = async (file: File): Promise<PolicyAnalysis> => {
  // Accessing process.env.API_KEY directly as required.
  const apiKey = (process.env as any).API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key configuration missing. Ensure API_KEY is set in environment.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const fileHash = await calculateFileHash(base64Data);

  const prompt = `You are "The Insurance Boss", a world-class insurance auditor. Analyze this insurance policy PDF. 
  Perform a deep technical audit and extract the following details as highly structured data:
  1. Full Insured Legal Name & Primary Service Address.
  2. Policy Number, FEIN (if available), and Industry/Class code.
  3. Effective and Expiration Dates.
  4. All Major Coverage Limits (GL, Work Comp, Auto, etc.)
  5. 3-5 major Red Flags/Gaps (Hidden exclusions, low limits, missing endorsements).
  6. A Premium vs Value assessment.
  7. Numerical strength score (0-10).
  8. Specific industry-specific exclusion audit findings.
  Output MUST be valid JSON.`;

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
            rating: { type: Type.STRING },
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
          required: ["insuredName", "score", "summary"]
        }
      }
    });

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
    console.error("Gemini Analysis Error:", error);
    throw new Error("Audit failed. Technical error encountered in Boss Neural Engine.");
  }
};
