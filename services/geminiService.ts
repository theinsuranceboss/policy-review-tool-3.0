
import { GoogleGenAI, Type } from "@google/genai";
import { PolicyAnalysis } from "../types";

const ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/25763261/ucbw8rp/";

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
 * Triggers the outbound webhook for EZLynx/CRM integration.
 */
const triggerWebhook = async (data: any) => {
  try {
    await fetch(ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors', 
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.warn("Webhook signaling failure (non-critical):", e);
  }
};

/**
 * Helper to perform exponential backoff retries for transient API errors.
 */
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
      const isOverloaded = error.message?.includes('503') || error.message?.includes('500');
      const isInvalidBudget = error.message?.includes('400') && error.message?.includes('Budget 0');
      
      if ((isRateLimit || isOverloaded) && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`Boss Engine Throttled. Attempt ${i + 1}/${retries}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (isInvalidBudget) {
          // This error is configuration-based, retrying won't fix it if the code is wrong.
          throw error;
      }
      
      throw error;
    }
  }
  throw lastError;
};

/**
 * Deep scan of insurance policy using Gemini.
 */
export const analyzePolicy = async (file: File, signal?: AbortSignal): Promise<PolicyAnalysis> => {
  // Rely on the environment variable 'process.env.API_KEY' directly as per guidelines.
  // The system handles injection automatically.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const fileHash = await calculateFileHash(base64Data);

  const prompt = `### ROLE: High-Precision Underwriting Engine for "The Insurance Boss" ###

**MISSION:** 
Extract insurance data and format it into a granular JSON structure for EZLynx and Zapier Tables.

**STRICT EXTRACTION RULES:**
1. **Output Format:** Return ONLY a raw JSON object. Do not include markdown tags like "\`\`\`json".
2. **Address Splitting (Mandatory):** Do NOT provide a single address string. You MUST split the address into: client_address_street, client_address_city, client_address_state, and client_address_zip.
3. **Name Splitting (Mandatory):** Always separate client_first_name and client_last_name.
4. **Missing Data:** Use null for any field not found in the document.
5. **Accuracy:** Extract client_phone and client_email exactly as they appear.
6. **Dates:** Format as YYYY-MM-DD.
7. **Logic Integration:** Analyze the document. If it is an Auto policy but no Homeowner policy is detected, add "Auto no Home" to the cross_sell_flags array.

**AUDIT PERSONA:**
You are also the "Authority Audit Terminal." Use authoritative, technical, and direct language for the user-facing summary and recommendations.

**JSON SCHEMA PROTOCOL:**
You must satisfy the response schema provided. The "ezlynx_data" property MUST use the exact keys required for Zapier Tables and EZLynx mapping.`;

  try {
    const generateContent = async () => {
      return await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          // The model will use its default reasoning configuration.
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
              },
              ezlynx_data: {
                type: Type.OBJECT,
                properties: {
                  client_first_name: { type: Type.STRING, nullable: true },
                  client_last_name: { type: Type.STRING, nullable: true },
                  client_email: { type: Type.STRING, nullable: true },
                  client_phone: { type: Type.STRING, nullable: true },
                  client_address_street: { type: Type.STRING, nullable: true },
                  client_address_city: { type: Type.STRING, nullable: true },
                  client_address_state: { type: Type.STRING, nullable: true },
                  client_address_zip: { type: Type.STRING, nullable: true },
                  policy_carrier: { type: Type.STRING, nullable: true },
                  policy_number: { type: Type.STRING, nullable: true },
                  policy_lob_type: { type: Type.STRING, nullable: true },
                  cross_sell_flags: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            }
          }
        }
      });
    };

    const response = await callWithRetry(generateContent);

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const result = JSON.parse(response.text || '{}');
    
    let finalScore = result.score || 0;
    if (finalScore > 10) finalScore = finalScore / 10;
    finalScore = Math.max(0, Math.min(finalScore, 10));

    const analysis: PolicyAnalysis = {
      id: Math.random().toString(36).substr(2, 9),
      filename: file.name,
      uploadDate: new Date().toLocaleString(),
      fileHash,
      fileData: base64Data,
      ...result,
      score: finalScore,
      ezlynxData: result.ezlynx_data,
      uplinkData: {
        insured_name: result.insuredName || "N/A",
        carrier: result.carrierName || "N/A",
        premium: result.premiumAmount || "N/A",
        policy_type: result.type || "N/A",
        expiration: result.expirationDate || "N/A"
      }
    };

    // Auto-trigger EZLynx/Zapier Webhook
    if (analysis.ezlynxData) {
      triggerWebhook({
        webhook_target: ZAPIER_WEBHOOK_URL,
        ...analysis.ezlynxData
      });
    }

    return analysis;
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    
    // Customize quota error message for the user
    if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("Uplink Throttled: Boss Central Engine quota has been exhausted. Please wait 60 seconds or switch to a high-capacity API key.");
    }

    if (error.message?.includes('400') && error.message?.includes('Budget 0')) {
      throw new Error("Uplink Configuration Error: The Boss Central Engine rejected a zero-thinking budget. Please contact support.");
    }
    
    throw new Error(error.message || "Unknown error occurred on Boss Central Engine.");
  }
};
