import { GoogleGenAI, Type } from "@google/genai";
import { PolicyAnalysis } from "../types";

export const calculateFileHash = async (base64: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(base64);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const analyzePolicy = async (file: File): Promise<PolicyAnalysis> => {
  // Always create a fresh instance right before making an API call to ensure it uses the most up-to-date API key from the environment.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const fileHash = await calculateFileHash(base64Data);

  const prompt = `You are "The Insurance Boss". Analyze this insurance policy PDF. 
  Extract the following details as structured data:
  1. Insured Name & Address
  2. Policy Number & Dates
  3. Coverage Limits (as an array of objects)
  4. 3-5 major Red Flags or gaps
  5. A summary of the coverage quality.
  6. A numerical score (0-10) representing the policy strength.
  Output MUST be valid JSON.`;

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
          effectiveDate: { type: Type.STRING },
          expirationDate: { type: Type.STRING },
          type: { type: Type.STRING },
          rating: { type: Type.STRING },
          score: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          coverageAnalysis: { type: Type.STRING },
          foundExclusions: { type: Type.ARRAY, items: { type: Type.STRING } },
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

  // Extract the text content using the .text property (not a method call).
  const result = JSON.parse(response.text || '{}');
  return {
    id: Math.random().toString(36).substr(2, 9),
    filename: file.name,
    uploadDate: new Date().toLocaleString(),
    fileHash,
    ...result
  };
};