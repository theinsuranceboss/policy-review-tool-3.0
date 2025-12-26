import { GoogleGenAI, Type } from "@google/genai";
import { PolicyAnalysis } from "../types";

// Using the provided API key to ensure the tool works out-of-the-box.
const INTERNAL_API_KEY = "AIzaSyBK4IqZKKhqZeX71dxSZ1nsybFyYitYPJk";

export const calculateFileHash = async (base64: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(base64);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const analyzePolicy = async (file: File): Promise<PolicyAnalysis> => {
  const apiKey = process.env.API_KEY || INTERNAL_API_KEY;
  
  if (!apiKey) {
    throw new Error("Boss, the API key is missing. Please ensure the key is correctly configured.");
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
  6. A Premium vs Value assessment (Is this a good deal for the coverage?).
  7. Numerical strength score (0-10).
  8. Specific industry-specific exclusion audit findings.
  Output MUST be valid JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
      fileData: base64Data, // Save for PDF downloads in admin
      ...result
    };
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Audit failed. The Boss is investigating the technical error.");
  }
};