
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
 * Deep scan of insurance policy using Gemini 3 Flash.
 * Switched to Flash to resolve quota limits while maintaining high-quality auditing.
 */
export const analyzePolicy = async (file: File, signal?: AbortSignal): Promise<PolicyAnalysis> => {
  // Always use process.env.API_KEY directly for initialization as per SDK guidelines.
  if (!process.env.API_KEY || process.env.API_KEY === 'undefined' || process.env.API_KEY === '') {
    throw new Error("Audit Failure: The Insurance Boss API key is not configured. Please check your deployment settings.");
  }

  // Use the exact required initialization pattern: new GoogleGenAI({ apiKey: ... })
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

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
      // Switched to gemini-3-flash-preview to resolve 429 quota errors while maintaining excellent reasoning capabilities
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
          { text: prompt }
        ]
      },
      config: {
        // Thinking budget allocated for complex reasoning; max for Flash is 24576
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
            rating: { 
              type: Type.STRING, 
              description: "Must be one of: Good, Needs Improvement, Poor, Unable to Analyze" 
            },
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
                },
                propertyOrdering: ["label", "limit"]
              }
            }
          },
          required: ["insuredName", "score", "summary", "redFlags", "rating"],
          propertyOrdering: [
            "insuredName", "insuredAddress", "policyNumber", "fein", "industry", 
            "effectiveDate", "expirationDate", "type", "rating", "score", 
            "summary", "coverageAnalysis", "premiumVsValue", "deductibles", 
            "foundExclusions", "industryExclusionAudit", "strengths", 
            "redFlags", "recommendations", "coverageLimits"
          ]
        }
      }
    });

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // Access the .text property directly as per the @google/genai guidelines
    const responseText = response.text?.trim() || '{}';
    const result = JSON.parse(responseText);
    
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
    throw error;
  }
};
