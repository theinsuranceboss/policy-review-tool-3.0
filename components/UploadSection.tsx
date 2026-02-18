
import React, { useState, useRef, useEffect } from 'react';
import { analyzePolicy, calculateFileHash } from '../services/geminiService';
import { PolicyAnalysis, PremiumRequest } from '../types';

interface UploadSectionProps {
  onAnalysisComplete: (analysis: PolicyAnalysis, details: { name: string; email: string }) => void;
  existingPolicies: PolicyAnalysis[];
  onOpenWizard: () => void;
  onPremiumRequest: (request: PremiumRequest) => void;
  auditCount: number;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onAnalysisComplete, existingPolicies, onOpenWizard, onPremiumRequest, auditCount }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasApiKey, setHasApiKey] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Check if API key is available
    if (!process.env.API_KEY || process.env.API_KEY === '') {
      setHasApiKey(false);
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const handleStop = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
    setProgress(0);
  };

  const startProgressSimulation = (isFastTrack: boolean = false) => {
    setProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const intervalSpeed = isFastTrack ? 10 : 50; 

    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        // Stop at 99% and wait for actual result to trigger 100%
        if (prev >= 99) {
          if (!isFastTrack) return 99;
          return 100;
        }
        const increment = isFastTrack ? 15 : (prev < 40 ? 4 : prev < 75 ? 1.5 : 0.2);
        return Math.min(prev + increment, 99);
      });
    }, intervalSpeed);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!hasApiKey) {
      console.error("Configuration Error: API Key missing.");
      return;
    }

    setIsUploading(true);
    startProgressSimulation();
    abortControllerRef.current = new AbortController();

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const fileHash = await calculateFileHash(base64Data);
      const existingMatch = existingPolicies.find(p => p.fileHash === fileHash);

      const userDetails = { name: 'Verified User', email: 'verified@user.terminal' };

      if (existingMatch) {
        startProgressSimulation(true); 
        await new Promise(r => setTimeout(r, 400)); 
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setProgress(100);
        setTimeout(() => {
          onAnalysisComplete(existingMatch, userDetails);
          setIsUploading(false);
          setProgress(0);
        }, 200);
        return;
      }

      // Block until analysis is returned, but webhook is backgrounded inside analyzePolicy
      const analysis = await analyzePolicy(file, abortControllerRef.current.signal);
      
      // BREAK THE 99% LOOP: Force finish immediately
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(100);
      
      setTimeout(() => {
        onAnalysisComplete(analysis, userDetails);
        setIsUploading(false);
        setProgress(0);
      }, 300);
      
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Technical Audit Failure:", err);
      setIsUploading(false);
      setProgress(0);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      
      alert(err.message || "Unknown error occurred on Boss Central Engine.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-4 px-4 bg-transparent max-w-5xl mx-auto animate-in fade-in duration-1000">
      
      <div className="mb-12 space-y-4">
        <h1 className="text-6xl md:text-8xl font-black leading-[1.0] tracking-tighter text-white">
          Is Your Policy <br />
          <span className="text-yellow-400">Protecting You?</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl font-bold max-w-2xl mx-auto leading-tight opacity-90">
          Upload your policy for an instant technical audit. <br />
          <span className="text-yellow-400">Identify gaps before they identify you.</span>
        </p>
      </div>

      <div 
        onClick={() => hasApiKey && !isUploading && fileInputRef.current?.click()}
        className={`w-full max-w-4xl min-h-[400px] rounded-[3.5rem] border border-white/10 flex flex-col items-center justify-center p-12 transition-all relative overflow-hidden bg-[#0d0d0d] shadow-2xl
          ${hasApiKey && !isUploading ? 'cursor-pointer hover:bg-white/[0.02] active:scale-[0.99] border-white/20' : 'opacity-80 cursor-default'}
          ${!hasApiKey ? 'grayscale opacity-50' : ''}
        `}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />

        {!hasApiKey && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-8 text-center">
            <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Engine Offline</h3>
            <p className="text-gray-400 text-sm font-bold max-w-sm">
              Boss Central Engine API Key is missing. <br />
              <span className="text-yellow-400">Admin: Configure VITE_GEMINI_API_KEY in Netlify.</span>
            </p>
          </div>
        )}

        {isUploading ? (
          <div className="w-full max-w-xl space-y-12 flex flex-col items-center animate-in fade-in zoom-in-95">
            <div className="relative w-32 h-32 mb-4">
              <div className="absolute inset-0 border-[8px] border-yellow-400/10 rounded-full" />
              <div className="absolute inset-0 border-[8px] border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-yellow-400 font-black text-2xl">{Math.round(progress)}%</span>
              </div>
            </div>
            <div className="w-full space-y-10">
              <div className="h-4 w-full bg-white/5 rounded-full p-1 border border-white/10 overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-yellow-400 rounded-full transition-all duration-300 relative shadow-[0_0_25px_rgba(250,204,21,0.5)]" 
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleStop(); }}
                className="px-10 py-4 bg-yellow-400 text-black font-black text-[11px] tracking-widest uppercase rounded-2xl hover:bg-yellow-500 transition-all shadow-xl"
              >
                Abort Audit
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-12 flex flex-col items-center">
            <div className="bg-white/[0.03] p-10 rounded-[2rem] border border-yellow-400/30 flex items-center justify-center shadow-2xl transition-transform duration-500 group">
              <div className="w-14 h-14 rounded-xl border-2 border-yellow-400/40 flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 15h2v-4h3l-4-4-4 4h3v4z"/>
                  <path d="M20 18H4v-7H2v7c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-7h-2v7z"/>
                </svg>
              </div>
            </div>
            <h3 className="text-5xl md:text-7xl font-black tracking-tighter leading-none text-white max-w-2xl">
              Upload Policy
            </h3>
          </div>
        )}
      </div>

      {!isUploading && hasApiKey && (
        <div className="mt-12 flex flex-col items-center gap-8 w-full">
          <a 
            href="https://theinsuranceboss.com/get-a-quote/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-24 py-6 rounded-2xl bg-yellow-400 text-black font-black text-sm tracking-widest hover:bg-yellow-500 transition-all active:scale-95 shadow-[0_15px_30px_rgba(250,204,21,0.3)] uppercase text-center"
          >
            Request Official Quote
          </a>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default UploadSection;
