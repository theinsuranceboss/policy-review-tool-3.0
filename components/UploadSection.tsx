import React, { useState, useRef } from 'react';
import { analyzePolicy, sendEmailNotification, calculateFileHash } from '../services/geminiService';
import { PolicyAnalysis } from '../types';

interface UploadSectionProps {
  onAnalysisComplete: (analysis: PolicyAnalysis, userDetails: { name: string; email: string }) => void;
  existingPolicies: PolicyAnalysis[];
  onOpenWizard: () => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onAnalysisComplete, existingPolicies, onOpenWizard }) => {
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
      setError("Enter name and email to secure the audit.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(10);
    setStatusText("Reading file...");

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error("Error reading file"));
        reader.readAsDataURL(file);
      });

      setStatusText("Initiating Audit...");
      const fileHash = await calculateFileHash(base64Data);
      const existingMatch = existingPolicies.find(p => p.fileHash === fileHash);
      
      if (existingMatch) {
        setUploadProgress(100);
        setTimeout(() => {
          onAnalysisComplete(existingMatch, { name: userName, email: userEmail });
          setIsUploading(false);
        }, 500);
        return;
      }

      setStatusText("Boss AI Analysis...");
      const interval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 2 : prev));
      }, 300);

      const analysis = await analyzePolicy(file);
      clearInterval(interval);
      setUploadProgress(100);
      
      sendEmailNotification(analysis).catch(err => console.warn("Background notification failed:", err));
      
      setTimeout(() => {
        onAnalysisComplete(analysis, { name: userName, email: userEmail });
      }, 500);

    } catch (err: any) {
      setError(err.message || "Analysis failed.");
      setIsUploading(false);
    }
  };

  const isFormValid = userName.trim().length > 0 && userEmail.trim().length > 0;

  return (
    <div className="flex flex-col items-center justify-center text-center py-10 md:py-16 animate-in fade-in duration-1000 bg-transparent">
      
      {/* HEADER SECTION */}
      <div className="space-y-4 max-w-5xl px-4 mb-12">
        <h2 className="text-6xl md:text-[6.5rem] font-[900] tracking-tighter text-white leading-[0.9] uppercase italic-off">
          Is your policy <br /> <span className="text-yellow-400">protecting</span> you?
        </h2>
        <p className="text-gray-400 text-lg md:text-2xl font-bold max-w-3xl mx-auto opacity-70 leading-snug">
          Upload your policy for an instant technical audit. Identify <br className="hidden md:block"/> traps before they identify you.
        </p>
      </div>

      <div className="w-full max-w-4xl px-6 space-y-10">
        
        {/* INPUTS ROW */}
        {!isUploading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-3xl mx-auto mb-4">
            <div className="space-y-3">
              <label className="text-[11px] font-[900] text-gray-500 uppercase tracking-[0.2em] px-1">Full Name</label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl px-6 py-5 focus:outline-none focus:border-yellow-400/30 transition-all text-sm font-bold placeholder:text-gray-800 text-white"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-[900] text-gray-500 uppercase tracking-[0.2em] px-1">Email Address</label>
              <input 
                type="email" 
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="boss@example.com"
                className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl px-6 py-5 focus:outline-none focus:border-yellow-400/30 transition-all text-sm font-bold placeholder:text-gray-800 text-white"
              />
            </div>
          </div>
        )}

        {/* UPLOAD BOX */}
        <div 
          onClick={() => !isUploading && isFormValid && fileInputRef.current?.click()}
          className={`relative border border-white/5 rounded-[4rem] p-16 md:p-24 transition-all overflow-hidden bg-[#050505]/60 backdrop-blur-3xl flex flex-col items-center justify-center min-h-[400px]
            ${isUploading ? 'opacity-80' : isFormValid ? 'cursor-pointer hover:bg-white/[0.01] active:scale-[0.99] border-white/10' : 'opacity-100 grayscale-0'}
          `}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="application/pdf" 
            className="hidden" 
          />

          {isUploading ? (
            <div className="flex flex-col items-center space-y-8">
              <div className="w-20 h-20 border-[6px] border-yellow-400/10 border-t-yellow-400 rounded-full animate-spin" />
              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tighter uppercase text-white">{statusText}</h3>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em]">{uploadProgress}% COMPLETE</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-12">
              <div className="bg-white/[0.03] p-10 rounded-[2rem] border border-white/5 shadow-inner">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl md:text-[3.5rem] font-[900] tracking-tighter uppercase text-white leading-none">
                  {isFormValid ? 'Click to upload' : 'Enter your details first'}
                </h3>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        {!isUploading && (
          <div className="flex flex-col items-center gap-6 pt-6">
             <button 
              onClick={onOpenWizard}
              className="px-24 py-6 rounded-2xl bg-yellow-400 text-black font-[900] text-sm uppercase tracking-[0.3em] hover:bg-yellow-500 transition-all active:scale-95 shadow-[0_15px_40px_rgba(250,204,21,0.3)]"
            >
              GET A QUOTE
            </button>
            <p className="text-gray-500 text-[11px] font-[900] uppercase tracking-[0.4em] opacity-60">
              No policy handy? Fill out to get One
            </p>
          </div>
        )}

        {error && (
          <div className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold uppercase tracking-[0.2em] animate-in fade-in">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadSection;