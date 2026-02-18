import React, { useState, useRef, useEffect } from 'react';
import { analyzePolicy, calculateFileHash } from '../services/geminiService';
import { PolicyAnalysis, PremiumRequest } from '../types';
import { storage } from '../services/storage';

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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
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

    const intervalSpeed = isFastTrack ? 10 : 60; 

    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        // Stall at 98.9 to wait for the real result
        if (prev >= 98.9) {
          return 98.9;
        }
        
        let increment = 0;
        if (isFastTrack) {
          increment = 20;
        } else {
          if (prev < 30) increment = 4;
          else if (prev < 60) increment = 1.5;
          else if (prev < 85) increment = 0.5;
          else increment = 0.1;
        }
        
        return Math.min(prev + increment, 98.9);
      });
    }, intervalSpeed);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("Policy Authority Alert: File exceeds 15MB limit.");
      return;
    }

    setIsUploading(true);
    startProgressSimulation();
    abortControllerRef.current = new AbortController();

    try {
      const userDetails = { name: 'Verified Authority', email: 'verified@boss.terminal' };

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const fileHash = await calculateFileHash(base64Data);
      const existingMatch = existingPolicies.find(p => p.fileHash === fileHash);

      let analysis: PolicyAnalysis;

      if (existingMatch) {
        analysis = existingMatch;
        startProgressSimulation(true); 
      } else {
        // CALL ANALYSIS - BLOCKING FOR RESULT
        analysis = await analyzePolicy(file, abortControllerRef.current.signal);
        
        // CONCURRENT NON-BLOCKING BACKGROUND TASKS (Vault Commit)
        // We use Promise.allSettled to ensure background failures don't stall the UI
        Promise.allSettled([
          storage.savePolicy(analysis)
        ]).then(() => console.log("Boss Terminal: Vault data secured in background."));
      }

      // IMMEDIATE COMPLETION TRIGGER
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(100);
      
      // Delay slightly for visual 100% then trigger view switch
      setTimeout(() => {
        onAnalysisComplete(analysis, userDetails);
        setIsUploading(false);
        setProgress(0);
      }, 400);
      
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      console.error("Technical Audit Failure:", err);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setIsUploading(false);
      setProgress(0);
      
      alert(`AUDIT SYSTEM FAILURE: ${err.message || "Unknown error occurred on Boss Central Engine."}`);
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
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`w-full max-w-4xl min-h-[400px] rounded-[3.5rem] border border-white/10 flex flex-col items-center justify-center p-12 transition-all relative overflow-hidden bg-[#0d0d0d] shadow-2xl
          ${!isUploading ? 'cursor-pointer hover:bg-white/[0.02] active:scale-[0.99] border-white/20' : 'opacity-80 cursor-default'}
        `}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />

        {isUploading ? (
          <div className="w-full max-w-xl space-y-12 flex flex-col items-center animate-in fade-in zoom-in-95">
            <div className="relative w-32 h-32 mb-4">
              <div className="absolute inset-0 border-[8px] border-yellow-400/10 rounded-full" />
              <div className="absolute inset-0 border-[8px] border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-yellow-400 font-black text-2xl">{Math.floor(progress)}%</span>
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
              <p className="text-[10px] font-black text-gray-500 tracking-[0.3em] uppercase animate-pulse">
                Boss Authority Processing...
              </p>
              <button 
                onClick={(e) => { e.stopPropagation(); handleStop(); }}
                className="px-10 py-4 bg-red-500/10 text-red-400 border border-red-500/20 font-black text-[11px] tracking-widest uppercase rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl"
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

      {!isUploading && (
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