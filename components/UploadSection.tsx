
import React, { useState, useRef, useEffect } from 'react';
import { analyzePolicy, calculateFileHash } from '../services/geminiService';
import { PolicyAnalysis } from '../types';

interface UploadSectionProps {
  onAnalysisComplete: (analysis: PolicyAnalysis, userDetails?: { name: string; email: string }) => void;
  existingPolicies: PolicyAnalysis[];
  onOpenWizard: () => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onAnalysisComplete, existingPolicies, onOpenWizard }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing Boss Neural Engine...');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const startProgressSimulation = (isFastTrack: boolean = false) => {
    setProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const intervalSpeed = isFastTrack ? 20 : 100;

    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          return 98;
        }
        // If it's a vault hit, we move fast. Otherwise, standard slow-down curve.
        const increment = isFastTrack ? 15 : (prev < 50 ? 2 : prev < 80 ? 0.5 : 0.1);
        return Math.min(prev + increment, 98);
      });
    }, intervalSpeed);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusText('Checking Boss Vault for existing records...');
    startProgressSimulation();

    try {
      // 1. Read file as base64 to calculate hash immediately
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const fileHash = await calculateFileHash(base64Data);
      
      // 2. Search for existing analysis with this hash
      const existingMatch = existingPolicies.find(p => p.fileHash === fileHash);

      if (existingMatch) {
        // VAULT HIT: Fast track the UI and return existing result
        setStatusText('Policy found in Vault! Retrieving audit records...');
        startProgressSimulation(true); // Switch to fast progress
        
        await new Promise(r => setTimeout(r, 800)); // Small pause for UX feel
        
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setProgress(100);
        
        setTimeout(() => {
          onAnalysisComplete(existingMatch, { name: userName, email: userEmail });
        }, 300);
        return;
      }

      // 3. NO MATCH: Perform standard AI analysis
      setStatusText('No matching records. Initializing AI Technical Audit...');
      const analysis = await analyzePolicy(file);
      
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(100);
      
      setTimeout(() => {
        onAnalysisComplete(analysis, { name: userName, email: userEmail });
      }, 500);
      
    } catch (err: any) {
      console.error("Audit encounterted a technical issue:", err);
      setIsUploading(false);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  };

  const isFormValid = userName.trim() !== '' && userEmail.trim() !== '';

  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-transparent max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="mb-16 space-y-4">
        <h1 className="text-6xl md:text-[7.5rem] font-black leading-[0.85] tracking-tighter text-white">
          Is Your Policy <br />
          <span className="text-yellow-400">Protecting</span> You?
        </h1>
        <p className="text-gray-400 text-lg md:text-2xl font-bold max-w-2xl mx-auto leading-tight opacity-90">
          Upload your policy for an instant technical audit. Identify traps before they identify you.
        </p>
      </div>

      {/* INPUTS */}
      {!isUploading && (
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-8 text-left mb-10">
          <div className="space-y-3">
            <label className="text-[11px] font-black text-gray-500 tracking-wider ml-1">Full Name</label>
            <input 
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-5 text-sm font-bold focus:outline-none focus:border-yellow-400/40 transition-all text-white placeholder:text-gray-600 shadow-inner"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[11px] font-black text-gray-500 tracking-wider ml-1">Email Address</label>
            <input 
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="boss@example.com"
              className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-5 text-sm font-bold focus:outline-none focus:border-yellow-400/40 transition-all text-white placeholder:text-gray-600 shadow-inner"
            />
          </div>
        </div>
      )}

      {/* MAIN UPLOAD BOX */}
      <div 
        onClick={() => !isUploading && isFormValid && fileInputRef.current?.click()}
        className={`w-full max-w-4xl min-h-[450px] rounded-[4.5rem] border border-white/10 flex flex-col items-center justify-center p-12 transition-all relative overflow-hidden bg-black/20 backdrop-blur-xl
          ${isFormValid && !isUploading ? 'cursor-pointer hover:bg-white/[0.03] active:scale-[0.99] border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.4)]' : 'opacity-80'}
        `}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />

        {isUploading ? (
          <div className="w-full max-w-xl space-y-12 flex flex-col items-center">
            <div className="relative w-24 h-24 mb-4">
              <div className="absolute inset-0 border-[6px] border-yellow-400/10 rounded-full" />
              <div className="absolute inset-0 border-[6px] border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-yellow-400 font-black text-lg">{Math.round(progress)}%</span>
              </div>
            </div>

            <div className="w-full space-y-6">
              <div className="flex justify-between items-end mb-2 px-1">
                <span className="text-white font-black text-xl tracking-tighter uppercase">Boss Vault Authority</span>
                <span className="text-yellow-400 font-mono font-bold text-sm">{progress.toFixed(1)}% Completed</span>
              </div>
              
              {/* PROGRESS BAR TRACK */}
              <div className="h-6 w-full bg-white/5 rounded-full p-1.5 border border-white/10 overflow-hidden shadow-inner">
                {/* PROGRESS FILL */}
                <div 
                  className="h-full bg-yellow-400 rounded-full transition-all duration-300 relative shadow-[0_0_25px_rgba(250,204,21,0.5)]" 
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">
                  {statusText}
                </p>
                <div className="flex justify-center gap-1">
                   <div className={`w-1 h-1 rounded-full ${progress > 25 ? 'bg-yellow-400' : 'bg-white/10'}`} />
                   <div className={`w-1 h-1 rounded-full ${progress > 50 ? 'bg-yellow-400' : 'bg-white/10'}`} />
                   <div className={`w-1 h-1 rounded-full ${progress > 75 ? 'bg-yellow-400' : 'bg-white/10'}`} />
                   <div className={`w-1 h-1 rounded-full ${progress > 90 ? 'bg-yellow-400' : 'bg-white/10'}`} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12 flex flex-col items-center">
            <div className="bg-white/[0.05] p-10 rounded-[2.5rem] border border-white/10 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-500">
              <svg className="w-16 h-16 text-yellow-400/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="4" strokeWidth="2.5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15V9m0 0l-3 3m3-3l3 3" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-4xl md:text-[3.5rem] font-black tracking-tighter leading-none text-white">
                {isFormValid ? 'Click to Upload Policy' : 'Enter Your Details First'}
              </h3>
              {isFormValid && <p className="mt-4 text-gray-500 font-bold uppercase tracking-widest text-[10px]">Instant Audit Powered by Boss AI</p>}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      {!isUploading && (
        <div className="mt-12 flex flex-col items-center gap-6">
          <button 
            onClick={onOpenWizard}
            className="px-28 py-6 rounded-2xl bg-yellow-400 text-black font-black text-sm tracking-wider hover:bg-yellow-500 transition-all active:scale-95 shadow-[0_20px_50px_rgba(250,204,21,0.25)] uppercase"
          >
            Get A Quote
          </button>
          <p className="text-gray-500 text-[11px] font-black tracking-widest opacity-80 uppercase">
            No policy handy? Fill out to get one
          </p>
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
