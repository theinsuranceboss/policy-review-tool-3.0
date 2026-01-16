
import React from 'react';

interface VerificationPendingProps {
  email: string;
  onSimulateLink: () => void;
}

const VerificationPending: React.FC<VerificationPendingProps> = ({ email, onSimulateLink }) => {
  return (
    <div className="max-w-4xl mx-auto py-24 px-4 text-center animate-in fade-in zoom-in-95 duration-1000">
      <div className="bg-black/40 backdrop-blur-3xl p-16 md:p-24 rounded-[5rem] border border-white/10 shadow-2xl relative overflow-hidden">
        
        {/* Pulse Aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-yellow-400/5 rounded-full blur-[100px] animate-pulse" />

        <div className="relative z-10 space-y-12">
          <div className="bg-yellow-400/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto border border-yellow-400/20 shadow-[0_0_50px_rgba(250,204,21,0.1)]">
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="space-y-6">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-none text-white uppercase">
              Check Your <br />
              <span className="text-yellow-400">Inbox</span>
            </h2>
            <p className="text-gray-400 text-xl font-bold max-w-lg mx-auto leading-relaxed">
              We've sent a secure access link to <span className="text-white underline decoration-yellow-400/50">{email}</span>. Click the link to verify your identity and unlock the audit.
            </p>
          </div>

          <div className="pt-8 border-t border-white/5 space-y-4">
             <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Development Mode: Simulate the email link below</p>
             <button 
              onClick={onSimulateLink}
              className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-yellow-400 hover:border-yellow-400/30 transition-all active:scale-95"
             >
               Simulate Magic Link Click
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPending;
