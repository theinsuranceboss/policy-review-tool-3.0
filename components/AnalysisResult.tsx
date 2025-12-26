import React, { useRef, useState } from 'react';
import { PolicyAnalysis } from '../types';

interface AnalysisResultProps {
  analysis: PolicyAnalysis;
  onReset: () => void;
  onOpenWizard: () => void;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ analysis, onReset, onOpenWizard }) => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [bundleInfo, setBundleInfo] = useState('');
  const [isBundleRequested, setIsBundleRequested] = useState(false);

  const handleConsultExpert = () => {
    window.open('https://theinsuranceboss.com/contact/', '_blank');
  };

  const handleRequestBundle = () => {
    if (!bundleInfo.trim()) {
      alert("Please provide some policy details for the bundle review, Boss.");
      return;
    }
    setIsBundleRequested(true);
    setTimeout(() => {
      alert("Bundle review request received. Our experts will audit your entire portfolio.");
    }, 500);
  };

  const getScoreColor = () => {
    if (analysis.score >= 8) return 'text-green-400';
    if (analysis.score >= 5) return 'text-yellow-400';
    return 'text-red-500';
  };

  return (
    <div ref={dashboardRef} className="relative space-y-8 animate-in fade-in duration-1000 pb-24 max-w-7xl mx-auto px-4 bg-transparent text-white">
      
      {/* SECTION 1: TOP HEADER (SUMMARY & INSURED DETAILS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SUMMARY & SCORE CARD */}
        <div className="lg:col-span-8 bg-black/40 backdrop-blur-2xl rounded-[3rem] p-10 border border-white/10 relative overflow-hidden flex flex-col md:flex-row items-center gap-10 shadow-2xl">
          <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
            <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.89v5.93c0 4.62-3 8.94-7 10-4-1.06-7-5.38-7-10V8.07l7-3.89z"/>
            </svg>
          </div>

          <div className="flex flex-col items-center flex-shrink-0 text-center relative z-10">
            <div className="flex items-baseline gap-1">
              <span className={`text-9xl font-black tracking-tighter leading-none ${getScoreColor()}`}>
                {analysis.score.toFixed(1)}
              </span>
              <span className="text-3xl font-black text-gray-700 tracking-tighter">/10</span>
            </div>
            <p className="text-[10px] font-black text-gray-500 tracking-widest mt-2">Boss Score</p>
          </div>

          <div className="flex-1 space-y-6 relative z-10 text-left">
            <div className="flex flex-wrap gap-3">
              <div className="px-5 py-1.5 rounded-xl border border-yellow-400/30 bg-yellow-400/5 text-yellow-400 text-[10px] font-black tracking-wider">
                {analysis.rating || "Fair"}
              </div>
              <div className="px-5 py-1.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 text-[10px] font-black tracking-wider">
                {analysis.type || "Commercial Package Policy"}
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
        <div className="lg:col-span-4 bg-black/40 backdrop-blur-2xl rounded-[3rem] p-10 border border-white/10 relative overflow-hidden flex flex-col shadow-2xl text-left">
          <div className="absolute left-0 top-10 bottom-10 w-1.5 bg-yellow-400 rounded-full" />
          <h3 className="text-[10px] font-black text-gray-500 tracking-widest mb-10">Insured Details</h3>
          <div className="space-y-8 flex-1 flex flex-col justify-center">
            <DetailItem label="Company Name" value={analysis.insuredName} large highlight />
            <DetailItem label="Policy Number" value={analysis.policyNumber || "Not Found"} highlight />
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Effective" value={analysis.effectiveDate || "N/A"} />
              <DetailItem label="Expires" value={analysis.expirationDate || "N/A"} />
            </div>
            <DetailItem label="Location Address" value={analysis.insuredAddress || "See Policy Documents"} />
          </div>
        </div>
      </div>

      {/* SECTION 2: MIDDLE ROW (COVERAGE ANALYSIS & EXCLUSIONS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        <div className="bg-black/40 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/10 space-y-8 h-full shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-yellow-400 border border-white/10">
               <ShieldIcon />
            </div>
            <h3 className="text-xl font-black tracking-tighter text-white">Coverage Analysis</h3>
          </div>
          <p className="text-gray-400 text-lg font-semibold leading-relaxed">
            {analysis.coverageAnalysis}
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/10 space-y-10 h-full shadow-xl">
          <h3 className="text-xl font-black tracking-tighter text-red-500">Exclusions</h3>
          <ul className="space-y-4">
            {analysis.foundExclusions?.map((ex, i) => (
              <li key={i} className="flex items-center gap-4 group">
                <div className="flex-shrink-0 text-red-500">
                  <XIcon />
                </div>
                <span className="text-gray-400 text-base font-bold tracking-tight group-hover:text-red-400 transition-colors leading-none">
                  {ex}
                </span>
              </li>
            ))}
            {(!analysis.foundExclusions || analysis.foundExclusions.length === 0) && (
              <li className="text-gray-600 font-bold tracking-widest text-[10px]">No critical exclusions detected in scan.</li>
            )}
          </ul>
        </div>
      </div>

      {/* SECTION 3: BOTTOM ROW (STRENGTHS, RED FLAGS, RECOMMENDATIONS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        <ColumnCard 
          title="Strengths" 
          color="green" 
          icon={<CheckIcon />} 
          items={analysis.strengths} 
        />
        <ColumnCard 
          title="Red Flags" 
          color="red" 
          icon={<XIcon />} 
          items={analysis.redFlags} 
        />
        <ColumnCard 
          title="Recommendations" 
          color="yellow" 
          icon={<ArrowIcon />} 
          items={analysis.recommendations} 
        />
      </div>

      {/* NEW SECTION: FULL BUNDLE REVIEW REQUEST */}
      <div className="bg-black/40 backdrop-blur-3xl rounded-[3rem] p-10 border border-yellow-400/20 relative overflow-hidden group shadow-2xl text-left">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-yellow-400/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-yellow-400/10 transition-all duration-700" />
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-[10px] font-black tracking-widest animate-pulse">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              Account Maximization
            </div>
            <h3 className="text-4xl font-black tracking-tighter leading-none">
              Get A Full <span className="text-yellow-400">Bundle Review</span>
            </h3>
            <p className="text-gray-400 text-lg font-semibold leading-relaxed max-w-2xl">
              Do you have additional policies? For a truly comprehensive risk audit, the Boss needs to see your entire portfolio.
            </p>
          </div>

          <div className="w-full lg:w-1/2 space-y-4">
            {isBundleRequested ? (
              <div className="bg-yellow-400/10 border border-yellow-400/30 p-8 rounded-[2rem] text-center animate-in zoom-in-95">
                <p className="text-yellow-400 font-black text-xl tracking-tighter">Bundle Audit Initiated!</p>
                <p className="text-gray-500 text-sm mt-2 font-bold tracking-widest">Our risk specialists are standing by.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <textarea 
                  placeholder="e.g. Workers Comp ($1M/$1M), GL Excess ($5M)..."
                  value={bundleInfo}
                  onChange={(e) => setBundleInfo(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm font-bold focus:border-yellow-400 transition-all outline-none min-h-[100px] placeholder:text-gray-600 text-white"
                />
                <button 
                  onClick={handleRequestBundle}
                  className="bg-yellow-400 text-black px-6 py-4 rounded-xl text-xs font-black tracking-wider hover:bg-yellow-500 transition-all active:scale-95 shadow-xl"
                >
                  Audit My Entire Portfolio
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/10 text-left">
        <button 
          onClick={onReset} 
          className="text-gray-500 hover:text-white font-black text-xs tracking-wider transition-all flex items-center gap-3 group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          New Audit
        </button>
        <div className="flex gap-4">
          <button 
            onClick={handleConsultExpert} 
            className="bg-yellow-400 text-black px-12 py-5 rounded-2xl font-black text-xs tracking-wider hover:bg-yellow-500 transition-all shadow-xl active:scale-95 flex items-center gap-3"
          >
            Consult Expert
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailItem: React.FC<{ label: string; value: string; large?: boolean; highlight?: boolean }> = ({ label, value, large, highlight }) => (
  <div className="space-y-1.5">
    <p className="text-[9px] font-black text-gray-500 tracking-widest">{label}</p>
    <p className={`font-black tracking-tight leading-none ${large ? 'text-2xl' : 'text-base'} ${highlight ? 'text-yellow-400' : 'text-white'}`}>
      {value}
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
    <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 space-y-10 flex flex-col h-full shadow-lg">
      <h3 className={`text-xl font-black tracking-tighter ${titleColor[color]}`}>{title}</h3>
      <ul className="space-y-6 flex-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-4 items-start group">
            <div className={`mt-1 flex-shrink-0 ${titleColor[color]}`}>
              {icon}
            </div>
            <p className="text-gray-400 text-base font-bold leading-relaxed group-hover:text-white transition-colors tracking-tight">{item}</p>
          </li>
        ))}
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

const ArrowIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

export default AnalysisResult;