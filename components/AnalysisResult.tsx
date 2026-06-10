import React, { useRef, useState } from 'react';
import { PolicyAnalysis } from '../types';

interface AnalysisResultProps {
  analysis: PolicyAnalysis;
  onReset: () => void;
  onOpenWizard: () => void;
  isAdmin?: boolean;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ analysis, onReset, onOpenWizard, isAdmin }) => {
  const dashboardRef = useRef<HTMLDivElement>(null);

  const getScoreColor = () => {
    if (analysis.score >= 8) return 'text-green-400';
    if (analysis.score >= 5) return 'text-yellow-400';
    return 'text-red-500';
  };

  return (
    <div className="relative animate-in fade-in duration-1000 pb-24 max-w-7xl mx-auto px-4 bg-transparent text-white">
      
      {/* THE BRANDED DASHBOARD (Capture target for PDF) */}
      <div ref={dashboardRef} className="space-y-8 p-10 bg-black rounded-[3rem] border border-white/5">
        
        {/* LOGO & BRANDING FOR PDF EXPORT */}
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center p-2 bg-black overflow-hidden">
              <img 
                src="https://theinsuranceboss.com/wp-content/uploads/2026/05/IB-Logo-1.png" 
                alt="The Insurance Boss Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase leading-none text-white">
                THE INSURANCE BOSS <span className="text-yellow-400">- Policy Audit Report</span>
              </h1>
              <p className="text-[10px] text-gray-500 font-black tracking-[0.4em] uppercase mt-2">Authority Verification Protocol</p>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Report Generated</p>
            <p className="text-sm font-bold text-white">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* SECTION 1: TOP HEADER (SUMMARY & INSURED DETAILS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* SUMMARY & SCORE CARD */}
          <div className="lg:col-span-8 bg-[#0a0a0a] rounded-[2.5rem] p-10 border border-white/10 relative overflow-hidden flex flex-col md:flex-row items-center gap-10 shadow-2xl text-left">
            <div className="flex flex-col items-center flex-shrink-0 text-center relative z-10">
              <div className="flex items-baseline gap-1">
                <span className={`text-9xl font-black tracking-tighter leading-none ${getScoreColor()}`}>
                  {analysis.score.toFixed(1)}
                </span>
                <span className="text-3xl font-black text-gray-800 tracking-tighter">/10</span>
              </div>
              <p className="text-[10px] font-black text-gray-600 tracking-[0.3em] uppercase mt-2">Authority Score</p>
            </div>

            <div className="flex-1 space-y-6 relative z-10 text-left">
              <div className="flex flex-wrap gap-3">
                <div className="px-5 py-1.5 rounded-xl border border-yellow-400/30 bg-yellow-400/5 text-yellow-400 text-[10px] font-black tracking-wider uppercase">
                  Rating: {analysis.rating || "Fair"}
                </div>
                <div className="px-5 py-1.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 text-[10px] font-black tracking-wider uppercase">
                  LOB: {analysis.type || "Commercial Package"}
                </div>
              </div>
              <div className="pl-6 border-l-4 border-yellow-400">
                <p className="text-white text-2xl md:text-3xl font-bold leading-tight tracking-tight">
                  "{analysis.summary}"
                </p>
              </div>
            </div>
          </div>

          {/* INSURED DETAILS CARD */}
          <div className="lg:col-span-4 bg-[#0a0a0a] rounded-[2.5rem] p-10 border border-white/10 flex flex-col shadow-2xl text-left">
            <h3 className="text-[10px] font-black text-gray-500 tracking-widest mb-6 uppercase">Policy Identity</h3>
            <div className="space-y-6 flex-1 flex flex-col justify-center">
              <DetailItem label="Business Name" value={analysis.insuredName} large highlight />
              <DetailItem label="Carrier Name" value={analysis.carrierName || "Not detected"} highlight />
              <DetailItem label="Policy Number" value={analysis.policyNumber || "Not found"} />
              <div className="grid grid-cols-2 gap-4">
                <DetailItem label="Effective" value={analysis.effectiveDate || "N/A"} />
                <DetailItem label="Expiration" value={analysis.expirationDate || "N/A"} />
              </div>
              <DetailItem label="Current Premium" value={analysis.premiumAmount || "N/A"} />
            </div>
          </div>
        </div>

        {/* SECTION 2: COVERAGE ANALYSIS */}
        <hr className="border-white/5" />
        
        <div className="bg-[#0a0a0a] rounded-[2.5rem] p-10 border border-white/10 space-y-8 text-left shadow-xl">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-yellow-400 border border-white/10">
               <ShieldIcon />
            </div>
            <h3 className="text-2xl font-black tracking-tighter text-white">Coverage Audit & Technical Analysis</h3>
          </div>
          <p className="text-gray-300 text-lg font-medium leading-relaxed max-w-5xl">
            {analysis.coverageAnalysis}
          </p>
          
          {analysis.coverageLimits && analysis.coverageLimits.length > 0 && (
            <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              {analysis.coverageLimits.map((limit, idx) => (
                <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{limit.label}</p>
                  <p className="text-sm font-bold text-white mt-1">{limit.limit}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: RED FLAGS & EXCLUSIONS */}
        <hr className="border-white/5" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
          <div className="bg-[#0a0a0a] rounded-[2.5rem] p-10 border border-white/10 space-y-10 h-full shadow-xl">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20">
                 <XIcon />
              </div>
              <h3 className="text-2xl font-black tracking-tighter text-red-500">Critical Red Flags</h3>
            </div>
            <ul className="space-y-6">
              {analysis.redFlags?.map((flag, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0 text-red-500">
                    <AlertIcon />
                  </div>
                  <span className="text-gray-300 text-base font-bold leading-relaxed">
                    {flag}
                  </span>
                </li>
              ))}
              {(!analysis.redFlags || analysis.redFlags.length === 0) && (
                <li className="text-gray-600 font-bold tracking-widest text-[10px] uppercase">No critical red flags detected.</li>
              )}
            </ul>
          </div>

          <div className="bg-[#0a0a0a] rounded-[2.5rem] p-10 border border-white/10 space-y-10 h-full shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 border border-orange-500/20">
                 <ShieldIcon />
              </div>
              <h3 className="text-2xl font-black tracking-tighter text-orange-500">Found Exclusions</h3>
            </div>
            <ul className="space-y-4">
              {analysis.foundExclusions?.map((ex, i) => (
                <li key={i} className="flex items-center gap-4 group">
                  <div className="flex-shrink-0 text-orange-500">
                    <XIcon />
                  </div>
                  <span className="text-gray-300 text-base font-bold tracking-tight leading-none">
                    {ex}
                  </span>
                </li>
              ))}
              {(!analysis.foundExclusions || analysis.foundExclusions.length === 0) && (
                <li className="text-gray-600 font-bold tracking-widest text-[10px] uppercase">Standard exclusions apply.</li>
              )}
            </ul>
          </div>
        </div>

        {/* SECTION 4: STRENGTHS & OPPORTUNITIES */}
        <hr className="border-white/5" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
          <ColumnCard 
            title="Operational Strengths" 
            color="green" 
            icon={<CheckIcon />} 
            items={analysis.strengths} 
          />
          <ColumnCard 
            title="Optimization & Cross-Sell Opportunities" 
            color="yellow" 
            icon={<ArrowIcon />} 
            items={analysis.recommendations} 
          />
        </div>

        {/* FOOTER FOR PDF */}
        <div className="pt-12 mt-12 border-t border-white/5 flex items-center justify-between opacity-50">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Confidential Authority Report | The Insurance Boss Vault</p>
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Page 1 of 1</p>
        </div>
      </div>

      {/* ACTION BAR (Excluded from PDF) */}
      <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/10 text-left">
        <button 
          onClick={onReset} 
          className="text-gray-500 hover:text-white font-black text-xs tracking-wider transition-all flex items-center gap-3 group uppercase"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          New audit
        </button>
        <div className="flex gap-4">
          {/* Download and Consult buttons removed per request */}
        </div>
      </div>
    </div>
  );
};

const DetailItem: React.FC<{ label: string; value: string; large?: boolean; highlight?: boolean }> = ({ label, value, large, highlight }) => (
  <div className="space-y-1.5 text-left">
    <p className="text-[9px] font-black text-gray-600 tracking-widest uppercase">{label}</p>
    <p className={`font-black tracking-tight leading-tight ${large ? 'text-2xl' : 'text-base'} ${highlight ? 'text-yellow-400' : 'text-white'}`}>
      {value || 'Not found'}
    </p>
  </div>
);

const ColumnCard: React.FC<{ title: string; color: 'green' | 'red' | 'yellow'; icon: React.ReactNode; items: string[] }> = ({ title, color, icon, items }) => {
  const titleColor = {
    green: "text-green-500",
    red: "text-red-500",
    yellow: "text-yellow-400"
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 space-y-8 flex flex-col h-full shadow-lg text-left">
      <h3 className={`text-xl font-black tracking-tighter uppercase ${titleColor[color]}`}>{title}</h3>
      <ul className="space-y-6 flex-1 text-left">
        {items.map((item, i) => (
          <li key={i} className="flex gap-4 items-start group">
            <div className={`mt-1.5 flex-shrink-0 ${titleColor[color]}`}>
              {icon}
            </div>
            <p className="text-gray-300 text-base font-bold leading-relaxed tracking-tight">{item}</p>
          </li>
        ))}
        {(!items || items.length === 0) && <li className="text-gray-600 font-bold italic text-xs uppercase tracking-widest">No strategic items found.</li>}
      </ul>
    </div>
  );
};

const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const ArrowIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

export default AnalysisResult;