
import React, { useState, useRef, useEffect } from 'react';
import { analyzePolicy, calculateFileHash } from '../services/geminiService';
import { PolicyAnalysis, PremiumRequest } from '../types';
import { storage } from '../services/storage';

interface UploadSectionProps {
  onAnalysisComplete: (analysis: PolicyAnalysis, details: { name: string; email: string }) => void;
  existingPolicies: PolicyAnalysis[];
  onOpenWizard: () => void;
  onPremiumRequest: (request: PremiumRequest) => void;
}

const FREE_LIMIT = 5;

const UploadSection: React.FC<UploadSectionProps> = ({ onAnalysisComplete, existingPolicies, onOpenWizard, onPremiumRequest }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  
  // Premium/Limit State
  const [uploadCount, setUploadCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumLogin, setShowPremiumLogin] = useState(false);
  const [premiumUsername, setPremiumUsername] = useState('');
  const [premiumPassword, setPremiumPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Premium Request Form State
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqUsername, setReqUsername] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqStatus, setReqStatus] = useState<'idle' | 'submitting' | 'done'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Load local count
    const count = parseInt(localStorage.getItem('boss_upload_count') || '0');
    const premiumStatus = localStorage.getItem('boss_premium_session') === 'active';
    setUploadCount(count);
    setIsPremium(premiumStatus);

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

    const intervalSpeed = isFastTrack ? 10 : 100;

    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) {
          if (!isFastTrack) return 98;
          return 100;
        }
        const increment = isFastTrack ? 15 : (prev < 40 ? 3 : prev < 70 ? 0.8 : 0.2);
        return Math.min(prev + increment, 100);
      });
    }, intervalSpeed);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check Limit
    if (!isPremium && uploadCount >= FREE_LIMIT) {
      alert("Boss, you've reached your free audit limit. Log in for premium access.");
      setShowPremiumLogin(true);
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

      const userDetails = { name: userName, email: userEmail };

      if (existingMatch) {
        startProgressSimulation(true); 
        await new Promise(r => setTimeout(r, 800)); 
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setProgress(100);
        setTimeout(() => {
          onAnalysisComplete(existingMatch, userDetails);
          setIsUploading(false);
          setProgress(0);
        }, 300);
        return;
      }

      // Perform AI Analysis
      const analysis = await analyzePolicy(file, abortControllerRef.current.signal);
      
      // Increment count
      if (!isPremium) {
        const newCount = uploadCount + 1;
        setUploadCount(newCount);
        localStorage.setItem('boss_upload_count', newCount.toString());
      }

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(100);
      
      setTimeout(() => {
        onAnalysisComplete(analysis, userDetails);
        setIsUploading(false);
        setProgress(0);
      }, 500);
      
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

  const handlePremiumLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await storage.validatePremiumUser(premiumUsername, premiumPassword);
    if (isValid) {
      setIsPremium(true);
      localStorage.setItem('boss_premium_session', 'active');
      setShowPremiumLogin(false);
      setLoginError('');
    } else {
      setLoginError('Invalid credentials. Contact the Boss.');
    }
  };

  const handleSubmitPremiumRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqUsername || !reqPassword || !reqEmail) return;
    setReqStatus('submitting');
    
    const request: PremiumRequest = {
      id: Math.random().toString(36).substr(2, 9),
      username: reqUsername,
      password: reqPassword,
      email: reqEmail,
      requestDate: new Date().toLocaleString()
    };
    
    await new Promise(r => setTimeout(r, 1000));
    onPremiumRequest(request);
    setReqStatus('done');
    setReqUsername('');
    setReqPassword('');
    setReqEmail('');
    setTimeout(() => {
      setReqStatus('idle');
      setShowRequestForm(false);
    }, 2000);
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|hotmail)\.com$/i;
    return emailRegex.test(email.trim());
  };

  const isFormValid = userName.trim().length > 1 && isValidEmail(userEmail);
  const isLimitReached = !isPremium && uploadCount >= FREE_LIMIT;

  return (
    <div className="flex flex-col items-center justify-center text-center py-4 px-4 bg-transparent max-w-5xl mx-auto animate-in fade-in duration-1000">
      
      {/* HEADER */}
      <div className="mb-12 space-y-4">
        <h1 className="text-6xl md:text-8xl font-black leading-[1.0] tracking-tighter text-white">
          Is Your Policy <br />
          <span className="text-yellow-400">Protecting</span> You?
        </h1>
        <p className="text-gray-400 text-lg md:text-xl font-bold max-w-2xl mx-auto leading-tight opacity-90">
          Upload your policy for an instant technical audit (5 free quotes). Identify gaps before they identify you.
        </p>
      </div>

      {isLimitReached && !showPremiumLogin && (
        <div className="mb-10 w-full max-w-2xl bg-red-500/10 border border-red-500/20 p-8 rounded-3xl animate-in zoom-in-95">
          <h3 className="text-xl font-black text-white mb-2">Limit reached, Boss.</h3>
          <p className="text-gray-400 text-sm font-bold mb-6">
            You have used your 5 free audits. To continue inspecting more policies, please log in with your personal premium account.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <button 
              onClick={() => setShowPremiumLogin(true)}
              className="px-8 py-3 bg-yellow-400 text-black font-black text-xs rounded-xl hover:bg-yellow-500 uppercase tracking-widest shadow-lg transition-all"
             >
               Log in to premium
             </button>
             <button 
              onClick={() => setShowRequestForm(true)}
              className="px-8 py-3 bg-white/5 border border-white/10 text-gray-400 font-black text-xs rounded-xl hover:bg-white/10 uppercase tracking-widest transition-all"
             >
               Ask the Boss for your premium access
             </button>
          </div>
        </div>
      )}

      {showPremiumLogin && (
        <div className="mb-10 w-full max-w-md bg-[#121212] border border-white/10 p-8 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-black text-white mb-6 uppercase tracking-widest">Premium login</h3>
          <form onSubmit={handlePremiumLogin} className="space-y-4 text-left">
            <div>
              <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Username</label>
              <input 
                type="text"
                value={premiumUsername}
                onChange={(e) => setPremiumUsername(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-400 outline-none text-white"
                placeholder="BossUsername"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Password</label>
              <input 
                type="password"
                value={premiumPassword}
                onChange={(e) => setPremiumPassword(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-400 outline-none text-white"
                placeholder="••••••••"
              />
            </div>
            {loginError && <p className="text-red-400 text-[10px] font-bold uppercase">{loginError}</p>}
            <div className="pt-2 flex flex-col gap-3">
              <button 
                type="submit"
                className="w-full bg-yellow-400 text-black font-black py-3 rounded-xl hover:bg-yellow-500 uppercase text-xs tracking-widest shadow-xl transition-all"
              >
                Authenticate access
              </button>
              <button 
                type="button"
                onClick={() => setShowPremiumLogin(false)}
                className="w-full text-center text-gray-500 text-[10px] font-black uppercase hover:text-white transition-all"
              >
                Back to audit
              </button>
            </div>
          </form>
        </div>
      )}

      {!showPremiumLogin && !showRequestForm && (
        <>
          <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="text-left space-y-2">
              <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Full name</label>
              <input 
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-[#121212] border border-white/10 rounded-xl px-6 py-4 text-sm font-medium focus:outline-none focus:border-yellow-400/30 transition-all text-white placeholder:text-gray-700"
              />
            </div>
            <div className="text-left space-y-2">
              <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Email address</label>
              <input 
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Enter email (@gmail.com or @hotmail.com)"
                className="w-full bg-[#121212] border border-white/10 rounded-xl px-6 py-4 text-sm font-medium focus:outline-none focus:border-yellow-400/30 transition-all text-white placeholder:text-gray-700"
              />
              {!isValidEmail(userEmail) && userEmail.length > 0 && (
                <p className="text-red-500/80 text-[9px] font-bold uppercase tracking-widest ml-1 mt-1">Strictly @gmail.com or @hotmail.com required</p>
              )}
            </div>
          </div>

          <div 
            onClick={() => !isUploading && isFormValid && !isLimitReached && fileInputRef.current?.click()}
            className={`w-full max-w-4xl min-h-[400px] rounded-[3.5rem] border border-white/10 flex flex-col items-center justify-center p-12 transition-all relative overflow-hidden bg-[#0d0d0d] shadow-2xl
              ${!isUploading && isFormValid && !isLimitReached ? 'cursor-pointer hover:bg-white/[0.02] active:scale-[0.99] border-white/20' : 'opacity-80 cursor-default'}
            `}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />

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
                  <div className="space-y-3">
                    <div className="flex justify-end pr-2">
                       <span className="text-yellow-400 font-black text-xs tracking-widest">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-4 w-full bg-white/5 rounded-full p-1 border border-white/10 overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-yellow-400 rounded-full transition-all duration-300 relative shadow-[0_0_25px_rgba(250,204,21,0.5)]" 
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleStop(); }}
                    className="px-10 py-4 bg-yellow-400 text-black font-black text-[11px] tracking-widest uppercase rounded-2xl hover:bg-yellow-500 transition-all active:scale-95 shadow-[0_10px_20px_rgba(250,204,21,0.2)]"
                  >
                    Stop audit
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-12 flex flex-col items-center">
                <div className="bg-white/[0.03] p-10 rounded-[2rem] border border-white/5 flex items-center justify-center shadow-2xl transition-transform duration-500 group">
                  <div className="w-14 h-14 rounded-xl border-2 border-yellow-400/40 flex items-center justify-center">
                    <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11 15h2v-4h3l-4-4-4 4h3v4z"/>
                      <path d="M20 18H4v-7H2v7c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-7h-2v7z"/>
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-5xl md:text-7xl font-black tracking-tighter leading-none text-white">
                    {isLimitReached ? 'Limit reached' : isFormValid ? 'Click to upload policy' : 'Valid Name & Gmail/Hotmail required'}
                  </h3>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* FOOTER ACTIONS */}
      {!isUploading && (
        <div className="mt-12 flex flex-col items-center gap-8 w-full">
          <button 
            onClick={onOpenWizard}
            className="px-24 py-6 rounded-2xl bg-yellow-400 text-black font-black text-sm tracking-widest hover:bg-yellow-500 transition-all active:scale-95 shadow-[0_15px_30px_rgba(250,204,21,0.3)] uppercase"
          >
            Get a quote
          </button>
          
          <div className="flex flex-col gap-6 items-center">
            <p className="text-[11px] text-gray-600 font-black uppercase tracking-[0.2em] opacity-80">
              Identify gaps before they identify you.
            </p>
            
            {/* NEW ANIMATED SQUARE LIMIT INDICATOR */}
            {!isPremium && (
              <div className="group relative mt-2">
                <div className="absolute inset-0 bg-yellow-400/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl" />
                <div 
                  className="relative w-32 h-32 bg-[#0d0d0d] border-2 border-yellow-400/30 rounded-3xl flex flex-col items-center justify-center shadow-2xl transition-all duration-500 group-hover:bg-yellow-400 group-hover:border-yellow-400 group-hover:scale-110 cursor-default overflow-hidden animate-[bossFloat_4s_easeInOut_infinite]"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400/20 group-hover:bg-black/10" />
                  <span className="text-3xl font-black text-yellow-400 group-hover:text-black leading-none tracking-tighter">
                    {uploadCount}<span className="text-lg opacity-40 group-hover:opacity-60 mx-1">/</span>{FREE_LIMIT}
                  </span>
                  <span className="text-[9px] font-black text-gray-500 group-hover:text-black uppercase tracking-widest mt-2 px-4 text-center leading-tight">
                    Free Audits<br/>Used
                  </span>
                  <div className="absolute bottom-2 w-8 h-1 bg-yellow-400/10 rounded-full group-hover:bg-black/20" />
                </div>
              </div>
            )}
          </div>

          {/* ASKING THE BOSS FOR ACCESS SECTION */}
          {showRequestForm ? (
             <div className="w-full max-w-md bg-[#121212] border border-yellow-400/20 p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 mt-8 text-left">
               <h3 className="text-lg font-black text-white mb-6 uppercase tracking-widest">Request Premium Access</h3>
               {reqStatus === 'done' ? (
                  <div className="text-center py-6 text-yellow-400 font-black animate-in fade-in">
                    Access request sent to the Boss vault!
                  </div>
               ) : (
                  <form onSubmit={handleSubmitPremiumRequest} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Proposed Username</label>
                      <input 
                        required
                        type="text"
                        value={reqUsername}
                        onChange={(e) => setReqUsername(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-400 outline-none text-white"
                        placeholder="JohnDoe_Boss"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Proposed Password</label>
                      <input 
                        required
                        type="password"
                        value={reqPassword}
                        onChange={(e) => setReqPassword(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-400 outline-none text-white"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase ml-1">Business Email</label>
                      <input 
                        required
                        type="email"
                        value={reqEmail}
                        onChange={(e) => setReqEmail(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-400 outline-none text-white"
                        placeholder="Enter email"
                      />
                    </div>
                    <div className="pt-2 flex flex-col gap-3">
                      <button 
                        type="submit"
                        disabled={reqStatus === 'submitting'}
                        className="w-full bg-yellow-400 text-black font-black py-3 rounded-xl hover:bg-yellow-500 uppercase text-xs tracking-widest shadow-xl transition-all"
                      >
                        {reqStatus === 'submitting' ? 'Sending request...' : 'Ask the boss for your premium access'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowRequestForm(false)}
                        className="w-full text-center text-gray-500 text-[10px] font-black uppercase hover:text-white transition-all"
                      >
                        Cancel request
                      </button>
                    </div>
                  </form>
               )}
             </div>
          ) : (
            <button 
              onClick={() => setShowRequestForm(true)}
              className="mt-4 text-[10px] font-black text-gray-600 hover:text-yellow-400 uppercase tracking-[0.2em] transition-all border-b border-gray-800 pb-1"
            >
              Ask the boss for your premium access
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes bossFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-8px) rotate(1deg); }
          75% { transform: translateY(-4px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
};

export default UploadSection;
