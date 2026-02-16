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
 */
export const analyzePolicy = async (file: File, signal?: AbortSignal): Promise<PolicyAnalysis> => {
  if (!process.env.API_KEY || process.env.API_KEY === 'undefined' || process.env.API_KEY === '') {
    throw new Error("Uplink Failure: The Insurance Boss terminal is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const fileHash = await calculateFileHash(base64Data);

  const prompt = `### AUTHORITY AUDIT TERMINAL: UPLINK ENCRYPTED (AES-256) ###

**PERSONA:**
You are "The Insurance Boss Authority Audit Terminal." You provide cinematic, high-stakes technical inspections of insurance policies. You identify hidden gaps, coverage traps, and fine-print failures that put the client at risk.

**PROTOCOL:**
1. **AUTHENTICATION STATUS:** VERIFIED. Uplink established. Provide the policy document for immediate technical inspection. Identify gaps before they identify you.
2. **AUDIT STYLE:** Use aggressive, authoritative, and technical language. Do not sugarcoat findings.
3. **MISSION:** Perform a deep-dive technical analysis of limits and exclusions.

**DATA EXTRACTION PROTOCOL (INTERNAL UPLINK):**
You must extract the following fields exactly for the system uplink:
- insured_name: Full name of the insured entity.
- carrier: Name of the insurance carrier.
- premium: Total premium amount.
- policy_type: Line of business (e.g., General Liability, Workers Comp, BOP).
- expiration: Expiration/Renewal date.

**IMPORTANT:** The score MUST be on a scale of 0 to 10. If you calculate it as a percentage (0-100), divide it by 10.

**OUTPUT SCHEMA:**
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
        thinkingConfig: { thinkingBudget: 16000 },
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
            carrierName: { type: Type.STRING },
            premiumAmount: { type: Type.STRING },
            type: { type: Type.STRING },
            rating: { 
              type: Type.STRING, 
              description: "Must be one of: Good, Needs Improvement, Poor, Unable to Analyze" 
            },
            score: { type: Type.NUMBER, description: "A score from 0.0 to 10.0" },
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
            "effectiveDate", "expirationDate", "carrierName", "premiumAmount", "type", "rating", "score", 
            "summary", "coverageAnalysis", "premiumVsValue", "deductibles", 
            "foundExclusions", "industryExclusionAudit", "strengths", 
            "redFlags", "recommendations", "coverageLimits"
          ]
        }
      }
    });

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const responseText = response.text?.trim() || '{}';
    const result = JSON.parse(responseText);
    
    // Normalize score to 0-10 range if model outputs 0-100
    let finalScore = result.score || 0;
    if (finalScore > 10) {
      finalScore = finalScore / 10;
    }
    // Cap it at 10 just in case
    finalScore = Math.min(finalScore, 10);

    // Construct the requested uplink block with specific keys
    const uplinkData = {
      insured_name: result.insuredName || "N/A",
      carrier: result.carrierName || "N/A",
      premium: result.premiumAmount || "N/A",
      policy_type: result.type || "N/A",
      expiration: result.expirationDate || "N/A"
    };

    return {
      id: Math.random().toString(36).substr(2, 9),
      filename: file.name,
      uploadDate: new Date().toLocaleString(),
      fileHash,
      fileData: base64Data,
      ...result,
      score: finalScore,
      uplinkData
    };
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    console.error("Authority Audit Failed:", error);
    throw error;
  }
};