import { GoogleGenAI } from "@google/genai";
import { PolicyAnalysis, EZLynxPayload } from "../types";

const ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/25763261/ucmftd7/";
const ANALYSIS_TIMEOUT = 60000; // 60 seconds strict timeout for the AI generation

/**
 * Retrieves the API key with strict priority for Vite environment variables.
 */
const getApiKey = (): string => {
  // @ts-ignore - Strictly follow Netlify/Vite environment variable protocol
  const key = import.meta.env?.VITE_GEMINI_API_KEY;
  return key || "";
};

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
 * DATA EXTRACTION PROTOCOL (BACKGROUND UPLINK)
 * Sends extracted data to EZLynx via Zapier Hook.
 * Now non-blocking to prevent UI stalls.
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
      // Non-blocking fetch
      fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', 
        body: JSON.stringify(payload)
      }).catch(err => console.error("Background Webhook Error:", err));
      
      console.log("Uplink dispatched to Boss Central Gateway");
    } catch (e) {
      console.error("Error parsing AI JSON for Uplink", e);
    }
  }
};

/**
 * Helper to call Gemini with minimal delay for Pay-as-you-go (Level 1).
 */
async function generateWithRetry(ai: any, params: any, maxRetries = 3) {
  let delay = 300; 
  for (let i = 0; i < maxRetries; i++) {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("ANALYSIS_TIMEOUT")), ANALYSIS_TIMEOUT)
      );
      
      return await Promise.race([
        ai.models.generateContent(params),
        timeoutPromise
      ]) as any;

    } catch (error: any) {
      if (error.message === "ANALYSIS_TIMEOUT") throw error;

      const errorMsg = error.message || "";
      const isQuotaError = 
        errorMsg.includes('429') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') || 
        error.status === 'RESOURCE_EXHAUSTED';

      if (isQuotaError && i < maxRetries - 1) {
        const jitter = Math.random() * 100;
        const finalDelay = delay + jitter;
        await new Promise(resolve => setTimeout(resolve, finalDelay));
        delay *= 1.5; 
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

export const analyzePolicy = async (file: File, signal?: AbortSignal): Promise<PolicyAnalysis> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("AUTHORITY DENIED: Boss Central Engine API Key (VITE_GEMINI_API_KEY) is missing. Verify Netlify Environment Settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error("Failed to read policy document."));
    reader.readAsDataURL(file);
  });

  const fileHash = await calculateFileHash(base64Data);

  const prompt = `### PERSONA: Authority Audit Terminal for "The Insurance Boss" ###

**MISSION:** 
Analyze the provided insurance policy. Be aggressive, technical, and authoritative. Identify gaps.

**STRICT RESPONSE PROTOCOL:**
1. Generate a deep technical audit report in Markdown.
2. Embed a JSON object labeled [UI_METADATA] for dashboard display.
   - Include: score (0-10), rating, insuredName, policyNumber, carrierName, premiumAmount, type, effectiveDate, expirationDate, summary, coverageAnalysis, strengths[], redFlags[], recommendations[], foundExclusions[], coverageLimits[{label, limit}].
3. MANDATORY: Generate the structured JSON data block at the very end for EZLynx uplink.

Format the technical block EXACTLY like this:
--- UPLINK DATA START ---
{
  "client_name": "[Full Name of Insured]",
  "client_email": "[Email if found]",
  "client_phone": "[Phone if found]",
  "client_street": "[Extract Street Address only]",
  "client_city": "[Extract City only]",
  "client_state": "[Extract State code only]",
  "client_zip": "[Extract Zip code only]",
  "carrier_name": "[Current Carrier Name]",
  "policy_number": "[Full Policy Number]",
  "current_premium": "[Annual Premium]",
  "policy_type": "[LOB]",
  "expiration_date": "[YYYY-MM-DD]",
  "summary": "[The full technical summary of the policy analysis]"
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
    
    // 1. Background Technical Uplink (NON-BLOCKING)
    sendToZapier(fullText).catch(e => console.error("Silent Uplink Error:", e));

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
      throw new Error("Audit failed to extract metadata. Check document format.");
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
    if (error.message === 'ANALYSIS_TIMEOUT') {
      throw new Error("ANALYSIS_TIMEOUT: The document analysis is taking too long. Please retry with a shorter PDF.");
    }
    throw new Error(error.message || "Boss Central Engine Failure.");
  }
};