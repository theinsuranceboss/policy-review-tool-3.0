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

  let cleaned = content.replace(/```json\n?|```/g, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
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
 * Sends extracted data to EZLynx via Zapier Hook with original file binary.
 */
const sendToZapier = async (text: string, fileBase64: string) => {
  const startTag = "--- UPLINK DATA START ---";
  const endTag = "--- UPLINK DATA END ---";
  
  const startIndex = text.indexOf(startTag);
  const endIndex = text.indexOf(endTag);

  if (startIndex !== -1 && endIndex !== -1) {
    const jsonString = text.substring(startIndex + startTag.length, endIndex).trim();
    try {
      const payload: EZLynxPayload = JSON.parse(jsonString);
      
      // Formatting Requirements:
      // 1. Send file as Base64 string with MIME type header
      const formattedFile = `data:application/pdf;base64,${fileBase64}`;
      payload.policy_file = formattedFile;
      
      // 2. Filename Integrity: [full_name]_Policy.pdf
      const safeName = (payload.client_name || 'Policy_Audit').replace(/[^a-z0-9]/gi, '_');
      payload.policy_filename = `${safeName}_Policy.pdf`;

      // 3. Lead Data Integration: Map extracted literals to required fields
      payload.full_name = payload.client_name;
      payload.email = payload.client_email;
      payload.phone = payload.client_phone;

      // Logic Flow Requirement: Triggered during AI processing completion
      // Confirmation: Provide hidden status message/console log
      console.log('Binary file data attached to webhook payload');
      
      fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', 
        body: JSON.stringify(payload)
      }).catch(err => console.error("Background Webhook Dispatch Error:", err));
      
      console.log(`Boss Terminal: Authority uplink for ${payload.policy_filename} dispatched.`);
    } catch (e) {
      console.error("Error parsing Uplink JSON:", e);
    }
  }
};

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
Analyze the provided insurance policy document. Extract ACTUAL, LITERAL text values. 

**DATA EXTRACTION RULES:**
- DO NOT use placeholders like "EXTRACTED".
- Extract LITERAL string values as they appear in the document.
- If a value is missing, use "Not found".
- Extract separate address components: Street, City, State, and Zip.

**STRICT RESPONSE PROTOCOL:**
1. Generate a technical audit report in Markdown format.
2. Embed a JSON object labeled [UI_METADATA] for the results dashboard.
   - Required Fields (Literal strings or "Not found"): 
     score (0-10 number), rating, insuredName, dba, fein, yearsInBusiness, policyNumber, carrierName, premiumAmount, type, effectiveDate, expirationDate, 
     insuredStreet, insuredCity, insuredState, insuredZip, 
     contactName, contactEmail, contactPhone, 
     summary, coverageAnalysis, strengths[], redFlags[], recommendations[], foundExclusions[], coverageLimits[].
3. MANDATORY: Generate a structured JSON block at the very end for EZLynx.

Format the technical block EXACTLY like this:
--- UPLINK DATA START ---
{
  "client_name": "[Literal Full Name of Insured]",
  "client_email": "[Literal Email]",
  "client_phone": "[Literal Phone]",
  "client_street": "[Literal Street Address]",
  "client_city": "[Literal City]",
  "client_state": "[Literal State]",
  "client_zip": "[Literal Zip Code]",
  "business_name": "[Literal Business Name]",
  "dba": "[Literal DBA]",
  "fein_ein": "[Literal FEIN]",
  "years_in_business": "[Literal Years]",
  "carrier_name": "[Literal Carrier]",
  "current_premium": "[Literal Annual Premium]",
  "policy_type": "[Literal LOB]",
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
    
    // Backgrounded Webhook trigger now including Base64 formatted PDF
    sendToZapier(fullText, base64Data);

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
      throw new Error("Audit processing successful, but metadata extraction failed.");
    }

    const uplinkData: EZLynxPayload = extractJSON(fullText, "--- UPLINK DATA START ---", "--- UPLINK DATA END ---");

    const fullAddress = uiData.insuredStreet && uiData.insuredStreet !== "Not found" 
      ? `${uiData.insuredStreet}, ${uiData.insuredCity}, ${uiData.insuredState} ${uiData.insuredZip}` 
      : uiData.insuredAddress;

    const analysis: PolicyAnalysis = {
      id: Math.random().toString(36).substr(2, 9),
      filename: file.name,
      uploadDate: new Date().toLocaleString(),
      fileHash,
      fileData: base64Data,
      score: typeof uiData.score === 'number' ? uiData.score : parseFloat(uiData.score) || 0,
      rating: uiData.rating || 'Needs Improvement',
      insuredName: uiData.insuredName || uiData.business_name || 'Not found',
      dba: uiData.dba || 'Not found',
      fein: uiData.fein || 'Not found',
      yearsInBusiness: uiData.yearsInBusiness || 'Not found',
      insuredAddress: fullAddress || 'Not found',
      policyNumber: uiData.policyNumber || 'Not found',
      carrierName: uiData.carrierName || 'Not found',
      premiumAmount: uiData.premiumAmount || 'Not found',
      type: uiData.type || 'Not found',
      effectiveDate: uiData.effectiveDate || 'Not found',
      expirationDate: uiData.expirationDate || 'Not found',
      contactEmail: uiData.contactEmail || 'Not found',
      contactPhone: uiData.contactPhone || 'Not found',
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