
import React, { useState, useRef } from 'react';
import { analyzePolicy, sendEmailNotification, calculateFileHash } from '../services/geminiService';
import { PolicyAnalysis } from '../types';

interface UploadSectionProps {
  onAnalysisComplete: (analysis: PolicyAnalysis, userDetails: { name: string; email: string }) => void;
  existingPolicies: PolicyAnalysis[];
}

const UploadSection: React.FC<UploadSectionProps> = ({ onAnalysisComplete, existingPolicies }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState("Analyzing Policy...");
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      setError("Please upload a PDF file.");
      return;
    }

    if (!userName.trim() || !userEmail.trim()) {
      setError("We need your name and email to secure the audit results.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(10);
    setStatusText("Reading file...");

    let interval: any = null;

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error("Error reading file"));
        reader.readAsDataURL(file);
      });

      setStatusText("Initiating Private Audit...");
      const fileHash = await calculateFileHash(base64Data);

      const existingMatch = existingPolicies.find(p => p.fileHash === fileHash);
      
      if (existingMatch) {
        setStatusText("Retrieved from Local Vault");
        setUploadProgress(100);
        setTimeout(() => {
          onAnalysisComplete(existingMatch, { name: userName, email: userEmail });
          setIsUploading(false);
        }, 500);
        return;
      }

      setStatusText("Boss AI Analysis...");
      interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 40) return prev + 5;
          if (prev < 85) return prev + 1;
          return prev;
        });
      }, 500);

      const analysis = await analyzePolicy(file);
      
      if (!analysis.contactEmail) analysis.contactEmail = userEmail;
      
      if (interval) clearInterval(interval);
      setUploadProgress(100);
      setStatusText("Audit Complete!");
      
      sendEmailNotification(analysis).catch(err => console.warn("Background notification failed:", err));
      
      setTimeout(() => {
        onAnalysisComplete(analysis, { name: userName, email: userEmail });
      }, 500);

    } catch (err: any) {
      console.error("Process error:", err);
      setError(err.message || "An unexpected error occurred during analysis.");
      setIsUploading(false);
    } finally {
      if (interval) clearInterval(interval);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-12 md:py-24 space-y-16 animate-in fade-in duration-1000">
      <div className="space-y-6 max-w-4xl px-4">
        <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-white italic leading-[0.9]">
          Is your policy <span className="text-yellow-400">protecting</span> you?
        </h2>
        <p className="text-gray-400 text-xl md:text-2xl font-medium italic max-w-2xl mx-auto">
          Upload your policy for an instant technical audit. Identify traps before they identify you.
        </p>
      </div>

      <div className="w-full max-w-4xl px-6 space-y-8">
        {!isUploading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-3xl mx-auto mb-4">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Full Name</label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-yellow-400/50 transition-all text-sm font-bold placeholder:text-gray-700"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Email Address</label>
              <input 
                type="email" 
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="boss@example.com"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-yellow-400/50 transition-all text-sm font-bold placeholder:text-gray-700"
              />
            </div>
          </div>
        )}

        <div 
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative border border-white/10 rounded-[4rem] p-12 md:p-20 transition-all cursor-pointer group overflow-hidden bg-[#0a0a0a] shadow-2xl
            ${isUploading ? 'opacity-80 scale-95' : 'hover:border-yellow-400/50 hover:bg-[#0d0d0d] active:scale-[0.98]'}
            ${(!userName.trim() || !userEmail.trim()) && !isUploading ? 'opacity-50 grayscale cursor-not-allowed' : ''}
          `}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="application/pdf" 
            className="hidden" 
            disabled={!userName.trim() || !userEmail.trim()}
          />

          {isUploading ? (
            <div className="flex flex-col items-center space-y-8">
              <div className="relative">
                 <svg className="w-24 h-24 animate-spin text-yellow-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-10" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-yellow-400 uppercase tracking-tighter">
                  {uploadProgress}%
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black italic tracking-tighter uppercase text-white">{statusText}</h3>
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Processing Technical Audit...</p>
              </div>
              <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 transition-all duration-700 shadow-[0_0_20px_rgba(250,204,21,0.5)]" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <div className="bg-yellow-400/10 p-8 rounded-[2rem] text-yellow-400 group-hover:scale-110 transition-all duration-500 border border-yellow-400/20 shadow-xl">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black italic tracking-tighter uppercase group-hover:text-yellow-400 transition-colors">
                  {(!userName.trim() || !userEmail.trim()) ? 'Enter your details first' : 'Click to upload policy'}
                </h3>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Private & Local Storage</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-8 p-8 bg-red-500/5 border border-red-500/20 rounded-[2rem] text-red-400 text-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-4 justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <p className="font-black uppercase tracking-tighter text-lg">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-red-400/40 hover:text-red-400 underline transition-colors"
            >
              Clear Error
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-12 opacity-30">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span className="text-xs font-black uppercase tracking-widest">Local Vault</span>
        </div>
        <div className="flex items-center gap-3">
           <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
           <span className="text-xs font-black uppercase tracking-widest">Boss Verified</span>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;
