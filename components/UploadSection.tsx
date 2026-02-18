import React, { useState, useRef, useEffect } from 'react';
import { analyzePolicy, calculateFileHash } from '../services/geminiService';
import { PolicyAnalysis, PremiumRequest } from '../types';

interface UploadSectionProps {
  onAnalysisComplete: (analysis: PolicyAnalysis) => void;
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
    // Check if API key is available on mount
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

    const intervalSpeed = isFastTrack ? 10 : 40; 

    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 98.5) {
          return 98.5;
        }
        
        let increment = 0;
        if (isFastTrack) {
          increment = 20;
        } else {
          if (prev < 30) increment = 4;
          else if (prev < 65) increment = 1.2;
          else if (prev < 90) increment = 0.4;
          else increment = 0.05;
        }
        
        return Math.min(prev + increment, 98.5);
      });
    }, intervalSpeed);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!hasApiKey) {
      console.error("Boss Authority Terminal Error: API Key is missing.");
      return;
    }

    setIsUploading(true);
    startProgressSimulation();
    abortControllerRef.current = new AbortController();

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error("Failed to read document stream."));
        reader.readAsDataURL(file);
      });

      const fileHash = await calculateFileHash(base64Data);
      const existingMatch = existingPolicies.find(p => p.fileHash === fileHash);

      let analysis: PolicyAnalysis;

      if (existingMatch) {
        analysis = existingMatch;
        startProgressSimulation(true); 
        await new Promise(r => setTimeout(r, 600)); 
      } else {
        // AI Analysis now background triggers the Zapier call with the binary PDF data
        analysis = await analyzePolicy(file, abortControllerRef.current.signal);
      }

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(100);
      
      setTimeout(() => {
        onAnalysisComplete(analysis);
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
      
      {/* HEADER SECTION - Removed 'uppercase' to allow Title Case as requested */}
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

      <div className="w-full max-w-2xl flex flex-col items-center mb-12">
        {/* UPLOAD TRIGGER - Single centered column as per screenshot */}
        <div 
          onClick={() => hasApiKey && !isUploading && fileInputRef.current?.click()}
          className={`group w-full min-h-[400px] rounded-[3rem] border flex flex-col items-center justify-center p-12 transition-all relative overflow-hidden bg-[#0d0d0d] shadow-2xl
            ${hasApiKey && !isUploading ? 'cursor-pointer hover:bg-white/[0.02] active:scale-[0.99] border-white/20' : 'opacity-80 cursor-default border-white/10'}
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
            </div>
          )}

          {isUploading ? (
            <div className="w-full max-w-xs space-y-12 flex flex-col items-center animate-in fade-in zoom-in-95">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-[6px] border-yellow-400/10 rounded-full" />
                <div className="absolute inset-0 border-[6px] border-yellow-400 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-yellow-400 font-black text-xl">{Math.floor(progress)}%</span>
                </div>
              </div>
              <div className="w-full space-y-4">
                <div className="h-2 w-full bg-white/5 rounded-full border border-white/10 overflow-hidden shadow-inner">
                  <div className="h-full bg-yellow-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[10px] font-black text-gray-500 tracking-[0.3em] uppercase animate-pulse">Boss Protocol Active</p>
              </div>
            </div>
          ) : (
            <div className="space-y-10 flex flex-col items-center">
              <div className="bg-yellow-400/10 p-10 rounded-[2.5rem] border border-yellow-400/30 flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:scale-110">
                <svg className="w-12 h-12 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 15h2v-4h3l-4-4-4 4h3v4z"/>
                  <path d="M20 18H4v-7H2v7c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-7h-2v7z"/>
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black tracking-tighter text-white uppercase">Upload Policy</h3>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">PDF Documents Only</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isUploading && hasApiKey && (
        <div className="mt-4 flex flex-col items-center gap-8 w-full animate-in fade-in">
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