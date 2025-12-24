import { GoogleGenAI, Type } from "@google/genai";
import { PolicyAnalysis } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

export const calculateFileHash = async (base64: string): Promise<string> => {
  try {
    if (window.isSecureContext && crypto.subtle) {
      const msgUint8 = new TextEncoder().encode(base64);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn("Secure crypto failed, falling back to basic hash", e);
  }
  
  let hash = 0;
  for (let i = 0; i < base64.length; i++) {
    const char = base64.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; 
  }
  return 'fallback-' + Math.abs(hash).toString(16);
};

export const analyzePolicy = async (file: File): Promise<PolicyAnalysis> => {
  // Use process.env.API_KEY directly to satisfy environment requirements and build constraints
  const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
  
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = () => reject(new Error("Failed to read the file."));
    reader.readAsDataURL(file);
  });

  const fileHash = await calculateFileHash(base64Data);

  const prompt = `You are "The Insurance Boss", a legendary insurance auditor.
  
  TASK:
  Analyze the provided PDF insurance policy and extract ALL data necessary for a complete risk lead.
  
  1. CUSTOMER DATA (LEAD GEN): 
     - Find the full Business Legal Name.
     - Extract Mailing Address.
     - Look for FEIN (Federal Tax ID) or EIN.
     - Find any Contact Information (Email, Phone) in headers, footers, or agency stamps.
     - Identify the primary Industry/Business Type.
  
  2. COVERAGE AUDIT:
     - Extract all Limits of Insurance.
     - Identify specific Exclusion clauses.
  
  3. BOSS SCORING:
     - Score 0-10 on coverage health.

  OUTPUT JSON. Be aggressive in finding contact details.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: file.type || 'application/pdf' } },
          { text: prompt }
        ]
      },
      config: {
        seed: 42,
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            rating: { type: Type.STRING, enum: ["Good", "Needs Improvement", "Poor"] },
            score: { type: Type.NUMBER },
            insuredName: { type: Type.STRING },
            insuredAddress: { type: Type.STRING },
            contactEmail: { type: Type.STRING },
            contactPhone: { type: Type.STRING },
            industry: { type: Type.STRING },
            fein: { type: Type.STRING },
            policyNumber: { type: Type.STRING },
            effectiveDate: { type: Type.STRING },
            expirationDate: { type: Type.STRING },
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
            summary: { type: Type.STRING },
            coverageAnalysis: { type: Type.STRING },
            premiumVsValue: { type: Type.STRING },
            exclusions: { type: Type.STRING },
            foundExclusions: { type: Type.ARRAY, items: { type: Type.STRING } },
            industryExclusionAudit: { type: Type.STRING },
            deductibles: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["insuredName", "type", "rating", "score", "summary", "foundExclusions"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis content returned from AI.");
    
    let result = JSON.parse(text);
    
    if (result.score > 10) result.score = result.score / 10;
    if (result.score < 0) result.score = 0;

    return {
      id: Math.random().toString(36).substr(2, 9),
      filename: file.name,
      uploadDate: new Date().toLocaleString(),
      fileData: base64Data,
      fileHash: fileHash,
      ...result
    };
  } catch (error: any) {
    console.error("Analysis error:", error);
    throw new Error(`Analysis failed: ${error?.message || "Unknown error"}`);
  }
};

export const sendEmailNotification = async (analysis: PolicyAnalysis) => {
  const EMAIL = "bossofinsurance@gmail.com";
  try {
    const iframeName = `form_target_${Date.now()}`;
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.action = `https://formsubmit.co/${EMAIL}`;
    form.method = 'POST';
    form.target = iframeName;

    const fields: Record<string, string> = {
      _subject: `BOSS ALERT: ${analysis.insuredName} - (${analysis.score.toFixed(1)}/10)`,
      _captcha: "false",
      insured_name: analysis.insuredName,
      contact_info: `${analysis.contactEmail || 'No Email'} / ${analysis.contactPhone || 'No Phone'}`,
      industry: analysis.industry || 'Unknown',
      fein: analysis.fein || 'N/A',
      policy_number: analysis.policyNumber || 'N/A',
      rating: analysis.rating,
      score: analysis.score.toFixed(1),
      summary: analysis.summary
    };

    for (const [key, value] of Object.entries(fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => {
      if (document.body.contains(form)) document.body.removeChild(form);
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 1000);
    return true;
  } catch (error) {
    return false;
  }
};