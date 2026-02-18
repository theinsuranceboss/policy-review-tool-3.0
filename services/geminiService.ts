import { GoogleGenAI } from "@google/genai";
import { PolicyAnalysis, EZLynxPayload } from "../types";

const ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/25763261/uchujcq/";

/**
 * Robustly extracts JSON from a string that might contain markdown, tags, or stray text.
 */
function extractJSON(text: string, startTag?: string, endTag?: string): any {
  let content = text;
  
  if (startTag && endTag) {
    const startIndex = text.indexOf(startTag);
    const endIndex = text.indexOf(endTag);
    if (startIndex === -1 || endIndex === -1) return null;
    content = text.substring(startIndex + startTag.length, endIndex).trim();
  }

  // 1. Initial cleanup: remove potential markdown code blocks
  let cleaned = content.replace(/```json\n?|```/g, '').trim();
  
  // 2. Direct attempt
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 3. Resilient fallback: Find the first '{' and last '}' to isolate the JSON object
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonCandidate);
      } catch (innerError) {
        console.error("Resilient JSON extraction failed.");
      }
    }
    
    console.error("JSON extraction failed for snippet:", cleaned.substring(0, 50));
    return null;
  }
}

/**
 * DATA EXTRACTION PROTOCOL (MANDATORY)
 * Sends extracted data to EZLynx via Zapier Hook.
 */
const sendToZapier = async (text: string) => {
  const startTag = "--- UPLINK DATA START ---";
  const endTag = "--- UPLINK DATA END ---";
  
  const startIndex = text.indexOf(startTag);
  const endIndex = text.indexOf(endTag);

  if (startIndex !== -1 && endIndex !== -1) {
    const jsonString = text.substring(startIndex + startTag.length, endIndex).trim();
    try {
      const payload: EZLynxPayload = JSON.parse(jsonString);
      await fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', 
        body: JSON.stringify(payload)
      });
      console.log("Uplink exitoso a EZLynx");
    } catch (e) {
      console.error("Error al parsear el JSON de la IA", e);
    }
  }
};

/**
 * Helper to call Gemini with exponential backoff on 429 errors.
 * Optimized for Paid Tier: Faster retries and less aggressive cooling periods.
 */
async function generateWithRetry(ai: any, params: any, maxRetries = 3) {
  let delay = 1500; // Optimized: Start with 1.5 seconds instead of 5
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const errorMsg = error.message || "";
      const isQuotaError = 
        errorMsg.includes('429') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') || 
        error.status === 'RESOURCE_EXHAUSTED';

      if (isQuotaError && i < maxRetries - 1) {
        // Reduced jitter for paid accounts to maintain throughput
        const jitter = Math.random() * 500;
        const finalDelay = delay + jitter;
        
        console.warn(`[Boss Engine] Temporary quota limit hit. Retrying in ${Math.round(finalDelay)}ms (Attempt ${i + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, finalDelay));
        delay *= 2; // Standard backoff
        continue;
      }
      throw error;
    }
  }
}

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
 * Deep scan of insurance policy using Gemini.
 */
export const analyzePolicy = async (file: File, signal?: AbortSignal): Promise<PolicyAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const fileHash = await calculateFileHash(base64Data);

  const prompt = `### PERSONA: Authority Audit Terminal for "The Insurance Boss" ###

**MISSION:** 
You are a high-precision cinematic underwriting engine. Your tone is technical, aggressive, and authoritative. Identify hidden gaps and coverage failures.

**STRICT RESPONSE PROTOCOL:**
1. Generate a deep cinematic technical audit report in Markdown format.
2. Embed a JSON object labeled [UI_METADATA] for the local dashboard. 
   - MUST include: score (number 0-10), rating (string), insuredName (string), policyNumber (string), carrierName (string), premiumAmount (string), type (string), effectiveDate (string), expirationDate (string), summary (string), coverageAnalysis (string), strengths (string[]), redFlags (string[]), recommendations (string[]), foundExclusions (string[]), coverageLimits ({label: string, limit: string}[]).
3. MANDATORY: After completing the cinematic audit, you MUST generate a structured JSON data block at the very end of your response for the technical uplink to EZLynx.

Format the technical block EXACTLY like this (DATA EXTRACTION PROTOCOL):
--- UPLINK DATA START ---
{
  "client_name": "[Full Name of Insured]",
  "client_email": "[Extract Email if present]",
  "client_phone": "[Extract Phone if present]",
  "client_street": "[Extract Street Address]",
  "client_city": "[Extract City]",
  "client_state": "[Extract State]",
  "client_zip": "[Extract Zip Code]",
  "carrier_name": "[Extract Current Carrier Name]",
  "current_premium": "[Extract Total Annual Premium]",
  "policy_type": "[LOB: e.g., GL, WC, Auto, Home, etc.]",
  "expiration_date": "[YYYY-MM-DD]"
}
--- UPLINK DATA END ---`;

  try {
    const response = await generateWithRetry(ai, {
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
          { text: prompt }
        ]
      }
    });

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const fullText = response.text || '';
    
    // 1. Process technical uplink to Zapier
    await sendToZapier(fullText);

    // 2. Extract UI Metadata
    let uiData = null;
    const uiDataMatch = fullText.match(/\[UI_METADATA\]\s*([\s\S]+?)(?=\n\n|---|$)/);
    
    if (uiDataMatch) {
      uiData = extractJSON(uiDataMatch[1]);
    }

    if (!uiData) {
      const jsonBlocks = fullText.match(/\{[\s\S]*?\}/g);
      if (jsonBlocks) {
        for (const block of jsonBlocks) {
          const parsed = extractJSON(block);
          if (parsed && (parsed.score !== undefined || parsed.rating !== undefined)) {
            uiData = parsed;
            break;
          }
        }
      }
    }

    if (!uiData) {
      throw new Error("UI metadata extraction failed. The Boss Terminal was unable to process the audit results.");
    }

    // 3. Extract local copy of uplink data
    const uplinkData: EZLynxPayload = extractJSON(fullText, "--- UPLINK DATA START ---", "--- UPLINK DATA END ---");

    const analysis: PolicyAnalysis = {
      id: Math.random().toString(36).substr(2, 9),
      filename: file.name,
      uploadDate: new Date().toLocaleString(),
      fileHash,
      fileData: base64Data,
      score: typeof uiData.score === 'number' ? uiData.score : parseFloat(uiData.score) || 0,
      rating: uiData.rating || 'Needs Improvement',
      insuredName: uiData.insuredName || 'Unknown',
      insuredAddress: uiData.insuredAddress || '',
      policyNumber: uiData.policyNumber || 'N/A',
      carrierName: uiData.carrierName || 'N/A',
      premiumAmount: uiData.premiumAmount || 'N/A',
      type: uiData.type || 'N/A',
      effectiveDate: uiData.effectiveDate || 'N/A',
      expirationDate: uiData.expirationDate || 'N/A',
      summary: uiData.summary || "Audit scan complete.",
      coverageAnalysis: uiData.coverageAnalysis || "Refer to report.",
      premiumVsValue: uiData.premiumVsValue || "N/A",
      exclusions: uiData.exclusions || "N/A",
      foundExclusions: uiData.foundExclusions || [],
      industryExclusionAudit: uiData.industryExclusionAudit || "N/A",
      deductibles: uiData.deductibles || "N/A",
      strengths: uiData.strengths || [],
      redFlags: uiData.redFlags || [],
      recommendations: uiData.recommendations || [],
      coverageLimits: uiData.coverageLimits || [],
      ezlynxData: uplinkData,
      uplinkData: uplinkData
    };

    return analysis;
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    
    if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("SYSTEM OVERLOAD: The Boss Authority Engine is seeing high traffic. Since you are on a paid tier, this should be transient. Please try again in a few moments.");
    }

    throw new Error(error.message || "Unknown error occurred on Boss Central Engine.");
  }
};