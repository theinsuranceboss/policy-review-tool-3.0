import React, { useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';

interface GatekeeperProps {
  onUnlock: () => void;
}

const Gatekeeper: React.FC<GatekeeperProps> = ({ onUnlock }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [showZapier, setShowZapier] = useState(false);
  const navigate = ReactRouterDOM.useNavigate();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code) {
      setError("Access Code Is Required.");
      return;
    }

    // Protocol: Accept 6 to 8 alphanumeric characters
    const isValidCode = code.length >= 6 && code.length <= 8 && /^[a-z0-9]+$/i.test(code);
    
    if (isValidCode) {
      setError('');
      onUnlock();
    } else {
      setError("Invalid Access Code. Verification Failed.");
    }
  };

  // Type assertion for custom web component
  const ZapierEmbed = 'zapier-interfaces-page-embed' as any;

  if (showZapier) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
        <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-6 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-6 px-4">
            <h3 className="text-yellow-400 font-bold text-sm tracking-widest uppercase">Request Authorization</h3>
            <button onClick={() => setShowZapier(false)} className="text-gray-500 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="rounded-2xl overflow-hidden bg-black border border-white/5 min-h-[500px]">
            {/* 
              Zapier Interface Web Component with Iframe Fallback 
              Page ID updated to requested: cmllbos3g00467w2a9w8nmrfu
            */}
            <ZapierEmbed 
              page-id='cmllbos3g00467w2a9w8nmrfu' 
              no-background='false' 
              style={{ maxWidth: '100%', height: '500px', display: 'block', margin: '0 auto' }}
            >
              <iframe 
                src="https://interfaces.zapier.com/embed/page/cmllbos3g00467w2a9w8nmrfu" 
                style={{ width: '100%', height: '500px', border: 'none' }}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                title="Zapier Authorization Request Fallback"
              />
            </ZapierEmbed>
          </div>
          
          <p className="mt-4 text-[9px] text-gray-600 font-bold uppercase tracking-widest text-center">
            Authorized Connection via Zapier Gateway
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 animate-in fade-in duration-1000">
      <div className="w-full max-w-lg bg-[#0d0d0d] border border-white/10 rounded-[3rem] p-10 md:p-14 shadow-2xl relative overflow-hidden">
        
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between mb-10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_#dc2626]" />
            <span className="text-red-600 font-black text-[10px] tracking-[0.3em] uppercase">Status: Restricted</span>
          </div>
          <button 
            onClick={() => navigate('/admin')}
            className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors"
          >
            Staff Login
          </button>
        </div>

        <div className="space-y-10 text-center relative z-10">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-yellow-400 mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Enter Your <br />
              <span className="text-yellow-400">Access Code</span>
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              Authorized Personnel Only. <br /> Enter Your 6-8 Digit Authority Code To Initialize.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
              <input 
                type="text" 
                maxLength={8}
                value={code}
                onChange={(e) => {
                  setError('');
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                }}
                placeholder=""
                className={`w-full bg-[#050505] border-2 rounded-2xl py-6 text-center text-2xl font-black tracking-[0.2em] text-white transition-all outline-none 
                  ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-yellow-400'}
                `}
              />
              <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                6-8 Alphanumeric Characters
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl animate-in shake">
                <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">
                  {error}
                </p>
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-yellow-400 text-black font-black py-6 rounded-2xl hover:bg-yellow-500 transition-all active:scale-[0.98] shadow-[0_10px_30px_rgba(250,204,21,0.2)] uppercase text-sm tracking-[0.4em]"
            >
              Enter
            </button>
          </form>

          <div className="pt-8 border-t border-white/5">
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-4">No Credentials Detected?</p>
            <button 
              onClick={() => setShowZapier(true)}
              className="w-full bg-white/5 text-gray-400 border border-white/10 font-black py-5 rounded-2xl hover:bg-white/10 hover:text-white transition-all uppercase text-[10px] tracking-widest"
            >
              Request Authorization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Gatekeeper;