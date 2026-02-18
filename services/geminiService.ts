
import { GoogleGenAI } from "@google/genai";
import { PolicyAnalysis, EZLynxPayload } from "../types";

// Updated Zapier Webhook URL for EZLynx Uplink
const ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/25763261/ucmftd7/";

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
    return null;
  }
}

/**
 * DATA EXTRACTION PROTOCOL
 * Sends extracted data to EZLynx via Zapier Hook in the background.
 * Executed as fire-and-forget to ensure zero latency on UI transitions.
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
      // Non-blocking background fetch
      fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', 
        body: JSON.stringify(payload)
      }).catch(err => console.error("Background Webhook Dispatch Error:", err));
      
      console.log("Boss Terminal: Uplink packet dispatched to cloud.");
    } catch (e) {
      console.error("Error parsing Uplink JSON:", e);
    }
  }
};

/**
 * Helper to call Gemini with exponential backoff on 429 (Quota) and 503 (Unavailable) errors.
 * Uses gemini-3-flash-preview for maximum speed and reliability.
 */
async function generateWithRetry(ai: any, params: any, maxRetries = 3) {
  let delay = 1000; 
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const errorMsg = error.message || "";
      const isRetryable = 
        errorMsg.includes('429') || 
        errorMsg.includes('503') ||
        errorMsg.includes('RESOURCE_EXHAUSTED') || 
        errorMsg.includes('SERVICE_UNAVAILABLE') ||
        error.status === 'RESOURCE_EXHAUSTED' ||
        error.status === 'SERVICE_UNAVAILABLE';

      if (isRetryable && i < maxRetries - 1) {
        const jitter = Math.random() * 400;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        delay *= 2; 
        continue;
      }
      throw error;
    }
  }
}

export const calculateFileHash = async (base64: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(base64);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Deep scan of insurance policy using the optimized Gemini-3-Flash model.
 */
export const analyzePolicy = async (file: File, signal?: AbortSignal): Promise<PolicyAnalysis> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("AUTHORITY DENIED: VITE_GEMINI_API_KEY is missing. Configure Netlify environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error("Failed to read document stream."));
    reader.readAsDataURL(file);
  });

  const fileHash = await calculateFileHash(base64Data);

  const prompt = `### PERSONA: Authority Audit Terminal for "The Insurance Boss" ###

**MISSION:** 
Analyze the provided insurance policy. Identify technical gaps, coverage failures, and premium-to-value imbalances.

**STRICT RESPONSE PROTOCOL:**
1. Generate a technical audit report in Markdown format.
2. Embed a JSON object labeled [UI_METADATA] for the results dashboard.
   - Required: score (0-10), rating, insuredName, policyNumber, carrierName, premiumAmount, type, effectiveDate, expirationDate, summary, coverageAnalysis, strengths[], redFlags[], recommendations[], foundExclusions[], coverageLimits[].
3. MANDATORY: Generate a structured JSON block at the very end for EZLynx prospect creation.

Format the technical block EXACTLY like this:
--- UPLINK DATA START ---
{
  "client_name": "[Full Name of Insured]",
  "client_email": "[Extract Email]",
  "client_phone": "[Extract Phone]",
  "client_street": "[Extract Street Address]",
  "client_city": "[Extract City]",
  "client_state": "[Extract State]",
  "client_zip": "[Extract Zip Code]",
  "carrier_name": "[Extract Carrier]",
  "current_premium": "[Extract Annual Premium]",
  "policy_type": "[Extract LOB]",
  "expiration_date": "[YYYY-MM-DD]"
}
--- UPLINK DATA END ---`;

  try {
    const response = await generateWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
          { text: prompt }
        ]
      }
    });

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const fullText = response.text || '';
    
    // Background task: Uplink to Zapier
    sendToZapier(fullText);

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
      throw new Error("Audit processing successful, but metadata extraction failed. Verify document content.");
    }

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
      summary: uiData.summary || "Technical scan complete.",
      coverageAnalysis: uiData.coverageAnalysis || "Refer to technical report.",
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
    throw new Error(error.message || "Boss Central Engine connection failure.");
  }
};
