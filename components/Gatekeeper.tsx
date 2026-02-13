
import React, { useState } from 'react';

interface GatekeeperProps {
  onUnlock: () => void;
}

const Gatekeeper: React.FC<GatekeeperProps> = ({ onUnlock }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [showZapier, setShowZapier] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code) {
      setError("Access Restricted. Enter your 6-digit code to initialize the uplink.");
      return;
    }

    // Protocol: Accept 6-digit numerical codes
    if (code.length === 6 && /^\d+$/.test(code)) {
      setError('');
      onUnlock();
    } else {
      setError("Invalid code. Please check your email or request access.");
    }
  };

  const ZapierEmbed = 'zapier-interfaces-page-embed' as any;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 animate-in fade-in duration-1000">
      <div className="w-full max-w-xl bg-black border-[4px] border-yellow-400 rounded-[3rem] p-10 md:p-14 shadow-[0_0_120px_rgba(250,204,21,0.2)] relative overflow-hidden">
        
        {/* Security Pulse Indicator */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-3.5 h-3.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_#dc2626]" />
          <span className="text-red-600 font-black text-[12px] tracking-[0.4em] uppercase">● STATUS: LOCKED</span>
        </div>

        {!showZapier ? (
          <div className="space-y-10 text-center">
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-[0.9] uppercase">
              IDENTITY <br />
              VERIFICATION
            </h1>
            
            <p className="text-gray-500 text-sm font-bold leading-tight uppercase tracking-tight max-w-xs mx-auto">
              Access to the Policy Review Tool is restricted. Enter your 6-digit code to proceed.
            </p>

            <form onSubmit={handleVerify} className="space-y-8">
              <div className="relative">
                <input 
                  type="text" 
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setError('');
                    setCode(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="X X X X X X"
                  className={`w-full bg-[#0d0d0d] border-2 rounded-2xl py-8 text-center text-4xl font-black tracking-[0.6em] text-yellow-400 transition-all outline-none placeholder:text-white/5 
                    ${error ? 'border-red-500/50' : 'border-white/10 focus:border-yellow-400'}
                  `}
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl animate-in shake">
                  <p className="text-red-500 text-[11px] font-black uppercase tracking-widest leading-relaxed">
                    {error}
                  </p>
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-yellow-400 text-black font-black py-7 rounded-2xl hover:bg-yellow-500 transition-all active:scale-95 shadow-[0_15px_40px_rgba(250,204,21,0.3)] uppercase text-sm tracking-[0.3em]"
              >
                ESTABLISH CONNECTION
              </button>
            </form>

            <div className="pt-8 border-t border-white/5">
              <button 
                onClick={() => setShowZapier(true)}
                className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-[0.4em] transition-all border-b border-transparent hover:border-white pb-1"
              >
                ASK THE BOSS FOR ACCESS
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in zoom-in-95">
             <div className="flex justify-between items-center px-2">
               <h3 className="text-yellow-400 font-black text-xs tracking-[0.3em] uppercase">Authority Request</h3>
               <button onClick={() => setShowZapier(false)} className="text-gray-500 hover:text-white transition-colors p-2">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             <div className="rounded-[2.5rem] overflow-hidden bg-black border border-yellow-400/30 shadow-2xl">
               <ZapierEmbed 
                 page-id='cmllbos3g00467w2a9w8nmrfu' 
                 style={{ maxWidth: '100%', height: '500px', display: 'block', backgroundColor: '#000000' }}
               />
             </div>
             <p className="text-[9px] text-gray-700 font-black uppercase tracking-widest text-center">Your unique authority key will be dispatched via secure email.</p>
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>
    </div>
  );
};

export default Gatekeeper;
