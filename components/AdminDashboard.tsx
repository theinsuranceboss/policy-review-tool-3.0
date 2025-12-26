import React, { useMemo, useState } from 'react';
import { PolicyAnalysis, AdminStats, QuoteRequest } from '../types';
import { storage } from '../services/storage';

interface AdminDashboardProps {
  policies: PolicyAnalysis[];
  leads: QuoteRequest[];
  onDeletePolicy: (id: string) => void;
  onDeleteLead: (id: string) => void;
  onStatusChange: (id: string, status: QuoteRequest['status']) => void;
  onViewPolicy: (p: PolicyAnalysis) => void;
  onImport: (json: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ policies, leads, onDeletePolicy, onDeleteLead, onStatusChange, onViewPolicy, onImport }) => {
  const [activeTab, setActiveTab] = useState<'policies' | 'leads' | 'data'>('policies');

  const stats = useMemo<AdminStats>(() => {
    return {
      totalPolicies: policies.length,
      totalLeads: leads.length,
      reviewed: policies.length,
      goodPolicies: policies.filter(p => p.rating === 'Good').length,
      needsImprovement: policies.filter(p => p.rating === 'Needs Improvement').length,
      needsReview: policies.filter(p => p.rating === 'Poor').length
    };
  }, [policies, leads]);

  const handleExportBackup = async () => {
    const backup = await storage.exportBackup();
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `InsuranceBossVault_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => onImport(e.target.result);
      reader.readAsText(file);
    };
    input.click();
  };

  const downloadOriginalPDF = (p: PolicyAnalysis) => {
    if (!p.fileData) {
      alert("Original PDF data not available for this record.");
      return;
    }
    const byteCharacters = atob(p.fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = p.filename || 'OriginalPolicy.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = (lead: QuoteRequest) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Lead Audit - ${lead.businessName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print { .no-print { display: none; } }
            body { font-family: sans-serif; padding: 40px; }
          </style>
        </head>
        <body>
          <div class="max-w-4xl mx-auto space-y-10">
            <div class="flex justify-between items-center border-b-4 border-black pb-8">
              <div>
                <h1 class="text-4xl font-black tracking-tighter">The Insurance Boss</h1>
                <p class="text-sm font-bold text-gray-500 tracking-widest">Lead Generation Audit</p>
              </div>
              <div class="text-right">
                <p class="text-xs font-bold text-gray-500">Submission ID</p>
                <p class="font-black text-xl">${lead.id.toUpperCase()}</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-12">
              <div class="space-y-6">
                <section>
                  <h2 class="text-[10px] font-black text-gray-500 tracking-widest mb-4">Business Information</h2>
                  <div class="space-y-3">
                    <p><strong>Legal Name:</strong> ${lead.businessName}</p>
                    <p><strong>DBA:</strong> ${lead.dba || 'None'}</p>
                    <p><strong>FEIN:</strong> ${lead.fein}</p>
                    <p><strong>Years in Business:</strong> ${lead.yearsInBusiness}</p>
                  </div>
                </section>
                <section>
                  <h2 class="text-[10px] font-black text-gray-500 tracking-widest mb-4">Location</h2>
                  <p>${lead.address1}${lead.address2 ? ', ' + lead.address2 : ''}<br>${lead.city}, ${lead.state} ${lead.zip}</p>
                </section>
              </div>
              <div class="space-y-6">
                <section>
                  <h2 class="text-[10px] font-black text-gray-500 tracking-widest mb-4">Risk Profile</h2>
                  <p><strong>Industries:</strong> ${lead.industries.join(', ')}</p>
                  ${lead.cslbClasses?.length ? `<p><strong>License Classes:</strong> ${lead.cslbClasses.join(', ')}</p>` : ''}
                </section>
                <section>
                  <h2 class="text-[10px] font-black text-gray-500 tracking-widest mb-4">Contact</h2>
                  <p><strong>Name:</strong> ${lead.contactName}</p>
                  <p><strong>Email:</strong> ${lead.contactEmail}</p>
                  <p><strong>Phone:</strong> ${lead.contactPhone}</p>
                </section>
              </div>
            </div>
            ${lead.extractedCoverage ? `
            <div class="p-8 bg-black text-white rounded-3xl space-y-4">
              <h2 class="font-black tracking-widest text-yellow-400">Extracted Policy Coverage</h2>
              <pre class="whitespace-pre-wrap font-mono text-sm opacity-80">${lead.extractedCoverage}</pre>
            </div>` : ''}
            <div class="pt-20 border-t border-gray-200 text-center text-[10px] text-gray-400">
              Generated by The Insurance Boss Policy Review Tool - Confidential Lead Data.
            </div>
          </div>
          <div class="fixed bottom-10 right-10 no-print">
            <button onclick="window.print()" class="bg-black text-white px-10 py-4 rounded-full font-bold shadow-2xl">Download as PDF</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight">Admin Dashboard</h2>
          <p className="text-gray-400 font-medium">"Managing Client Risk Like A Boss"</p>
        </div>
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
          <button 
            onClick={() => setActiveTab('policies')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'policies' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Policy Audits
          </button>
          <button 
            onClick={() => setActiveTab('leads')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'leads' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Smart Leads ({leads.length})
          </button>
          <button 
            onClick={() => setActiveTab('data')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'data' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Vault Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Audits" value={stats.totalPolicies} icon="file-text" color="gray" />
        <StatCard title="Smart Leads" value={stats.totalLeads} icon="trending-up" color="blue" />
        <StatCard title="High Risk" value={stats.needsReview} icon="x-circle" color="red" />
        <StatCard title="Solid Risk" value={stats.goodPolicies} icon="check-circle" color="green" />
      </div>

      {activeTab === 'policies' && (
        <div className="bg-[#1a1a1a] rounded-3xl border border-white/5 overflow-hidden">
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <h3 className="font-bold text-xl tracking-tighter">Policy Review Vault</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 text-[10px] font-bold tracking-widest border-b border-white/5 bg-black/20">
                  <th className="px-8 py-5">Insured Name</th>
                  <th className="px-8 py-5">Policy Info</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Score</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {policies.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-white">{p.insuredName || 'N/A'}</div>
                        <div className="text-[10px] text-gray-500 font-medium truncate max-w-[150px]">{p.filename}</div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-black text-gray-400 border border-white/10 tracking-tighter">
                          {p.type || 'Unknown'}
                        </span>
                        {p.policyNumber && <div className="text-[10px] text-gray-500 font-mono">#{p.policyNumber}</div>}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest ${
                        p.rating === 'Good' ? 'bg-green-500/10 text-green-400' : 
                        p.rating === 'Needs Improvement' ? 'bg-yellow-500/10 text-yellow-400' : 
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {p.rating}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-16 bg-white/5 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${p.score >= 7 ? 'bg-green-400' : p.score >= 4 ? 'bg-yellow-400' : 'bg-red-400'}`} 
                            style={{ width: `${Math.min(p.score * 10, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400 font-bold">{p.score.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => downloadOriginalPDF(p)}
                          className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-yellow-400 hover:bg-white/10 transition-all"
                          title="Download Original PDF"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" /></svg>
                        </button>
                        <button 
                          onClick={() => onViewPolicy(p)}
                          className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button 
                          onClick={() => onDeletePolicy(p.id)}
                          className="p-2.5 rounded-xl bg-red-500/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="bg-[#1a1a1a] rounded-3xl border border-white/5 overflow-hidden">
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <h3 className="font-bold text-xl tracking-tighter">Lead Generation Vault</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 text-[10px] font-bold tracking-widest border-b border-white/5 bg-black/20">
                  <th className="px-8 py-5">Business & Contact</th>
                  <th className="px-8 py-5">Extracted Coverage</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-8 py-6 max-w-xs">
                      <div className="space-y-2">
                        <div className="text-sm font-bold text-white truncate">{l.businessName}</div>
                        <div className="space-y-1">
                          <div className="text-[11px] font-black text-yellow-400 tracking-widest">{l.contactEmail || 'No Email'}</div>
                          <div className="text-[10px] text-gray-400 font-bold">{l.contactPhone || 'No Phone'}</div>
                          <div className="text-[10px] text-gray-500 truncate">{l.industries.join(', ')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="max-h-24 overflow-y-auto custom-scrollbar">
                        {l.extractedCoverage ? (
                          <pre className="text-[10px] text-gray-400 font-mono leading-tight whitespace-pre-wrap">{l.extractedCoverage}</pre>
                        ) : (
                          <span className="text-gray-600 text-[10px]">No coverage extracted</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <select 
                        value={l.status}
                        onChange={(e) => onStatusChange(l.id, e.target.value as QuoteRequest['status'])}
                        className={`text-[9px] font-black tracking-widest px-2 py-1 rounded bg-black/40 border border-white/10 focus:outline-none transition-colors ${
                          l.status === 'New' ? 'text-blue-400 border-blue-400/30' : 
                          l.status === 'Quoted' ? 'text-green-400 border-green-400/30' : 'text-gray-400'
                        }`}
                      >
                        <option value="New">New Lead</option>
                        <option value="In Review">In Review</option>
                        <option value="Quoted">Quoted</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleExportPDF(l)}
                          className="p-2.5 rounded-xl bg-yellow-400 text-black hover:bg-yellow-500 transition-all shadow-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </button>
                        <button 
                          onClick={() => onDeleteLead(l.id)}
                          className="p-2.5 rounded-xl bg-red-500/5 text-gray-500 hover:text-red-400 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4">
          <div className="bg-[#1a1a1a] p-10 rounded-[3rem] border border-white/5 space-y-8 text-center">
            <div className="space-y-4">
               <div className="w-20 h-20 bg-yellow-400/10 text-yellow-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
               </div>
               <h3 className="text-3xl font-black tracking-tighter">Boss Security Vault</h3>
               <p className="text-gray-400 leading-relaxed">
                 Manage local storage and database integrity. Export backups to maintain vault permanence.
               </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={handleExportBackup}
                className="bg-yellow-400 text-black px-8 py-5 rounded-2xl font-black tracking-wider hover:bg-yellow-500 transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Export Vault
              </button>
              <button 
                onClick={handleImportBackup}
                className="bg-white/5 text-white border border-white/10 px-8 py-5 rounded-2xl font-black tracking-wider hover:bg-white/10 transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                Restore Vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number; icon: string; color: string }> = ({ title, value, icon, color }) => {
  const colorMap: any = {
    yellow: 'text-yellow-400 bg-yellow-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    green: 'text-green-400 bg-green-500/10',
    red: 'text-red-400 bg-red-500/10',
    gray: 'text-gray-300 bg-white/10'
  };

  return (
    <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all duration-300">
      <div className="space-y-1">
        <p className="text-gray-500 text-[9px] font-bold tracking-widest">{title}</p>
        <p className="text-4xl font-black">{value}</p>
      </div>
      <div className={`p-3 rounded-2xl ${colorMap[color]} group-hover:scale-110 transition-transform duration-500`}>
        {icon === 'file-text' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        {icon === 'trending-up' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        {icon === 'check-circle' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        {icon === 'x-circle' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      </div>
    </div>
  );
};

export default AdminDashboard;