import React, { useState, useRef } from 'react';
import { analyzePolicy } from '../services/geminiService';
import { PolicyAnalysis } from '../types';

interface UploadSectionProps {
  onAnalysisComplete: (analysis: PolicyAnalysis, userDetails?: { name: string; email: string }) => void;
  existingPolicies: PolicyAnalysis[];
  onOpenWizard: () => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onAnalysisComplete, existingPolicies, onOpenWizard }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      // Analyze the policy using the Gemini API.
      const analysis = await analyzePolicy(file);
      onAnalysisComplete(analysis, { name: userName, email: userEmail });
    } catch (err: any) {
      setError(err.message || "Audit failed. Please ensure your API key is configured.");
      setIsUploading(false);
    }
  };

  const isFormValid = userName.trim() !== '' && userEmail.trim() !== '';

  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-transparent max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="mb-16 space-y-4">
        <h1 className="text-6xl md:text-[7.5rem] font-black italic leading-[0.85] tracking-tighter">
          Is Your Policy <br />
          <span className="text-yellow-400">Protecting</span> You?
        </h1>
        <p className="text-gray-500 text-lg md:text-2xl font-bold max-w-2xl mx-auto leading-tight italic opacity-80">
          Upload your policy for an instant technical audit. Identify traps before they identify you.
        </p>
      </div>

      {/* INPUTS */}
      {!isUploading && (
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-8 text-left mb-10">
          <div className="space-y-3">
            <label className="text-[11px] font-black text-gray-600 tracking-wider ml-1">Full Name</label>
            <input 
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold focus:outline-none focus:border-yellow-400/20 transition-all text-white"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[11px] font-black text-gray-600 tracking-wider ml-1">Email Address</label>
            <input 
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="boss@example.com"
              className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold focus:outline-none focus:border-yellow-400/20 transition-all text-white"
            />
          </div>
        </div>
      )}

      {/* MAIN UPLOAD BOX */}
      <div 
        onClick={() => !isUploading && isFormValid && fileInputRef.current?.click()}
        className={`w-full max-w-4xl min-h-[450px] rounded-[4.5rem] bg-[#050505] border border-white/5 flex flex-col items-center justify-center p-12 transition-all relative
          ${isFormValid && !isUploading ? 'cursor-pointer hover:bg-white/[0.01] active:scale-[0.99] border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]' : 'opacity-80'}
        `}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />

        {isUploading ? (
          <div className="space-y-8 flex flex-col items-center">
            <div className="w-20 h-20 border-[6px] border-yellow-400/10 border-t-yellow-400 rounded-full animate-spin" />
            <h3 className="text-3xl font-black italic tracking-tighter text-white">Boss AI Analysis...</h3>
          </div>
        ) : (
          <div className="space-y-12 flex flex-col items-center">
            <div className="bg-white/[0.03] p-10 rounded-[2.5rem] border border-white/5 flex items-center justify-center">
              <svg className="w-16 h-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="4" strokeWidth="2.5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15V9m0 0l-3 3m3-3l3 3" />
              </svg>
            </div>
            <h3 className="text-4xl md:text-[3.5rem] font-black italic tracking-tighter leading-none text-white">
              {isFormValid ? 'Click to Upload Policy' : 'Enter Your Details First'}
            </h3>
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      {!isUploading && (
        <div className="mt-12 flex flex-col items-center gap-6">
          <button 
            onClick={onOpenWizard}
            className="px-28 py-6 rounded-2xl bg-yellow-400 text-black font-black text-sm tracking-wider hover:bg-yellow-500 transition-all active:scale-95 shadow-[0_20px_50px_rgba(250,204,21,0.25)]"
          >
            Get A Quote
          </button>
          <p className="text-gray-700 text-[11px] font-black tracking-widest opacity-80">
            No policy handy? Fill out to get one
          </p>
        </div>
      )}

      {error && (
        <div className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-black tracking-widest animate-in fade-in">
          {error}
        </div>
      )}
    </div>
  );
};

export default UploadSection;