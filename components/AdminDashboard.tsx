
import React, { useMemo, useState, useEffect } from 'react';
import { PolicyAnalysis, AdminStats, QuoteRequest } from '../types';
import { storage } from '../services/storage';
import { gDrive } from '../services/googleDriveService';

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
  const [activeTab, setActiveTab] = useState<'policies' | 'leads' | 'data' | 'sync'>('policies');
  const [isGDriveConnected, setIsGDriveConnected] = useState(false);
  const [clientId, setClientId] = useState(localStorage.getItem('boss_gdrive_client_id') || '');

  useEffect(() => {
    setIsGDriveConnected(gDrive.isConnected());
  }, []);

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

  const handleGDriveConnect = () => {
    if (!clientId.trim()) {
      alert("Boss, please enter your Google Client ID first. You can get this from your Google Cloud Console.");
      return;
    }
    
    localStorage.setItem('boss_gdrive_client_id', clientId);
    
    gDrive.init(clientId, (token) => {
      setIsGDriveConnected(true);
    });
    
    gDrive.requestToken();
  };

  const handleGDriveDisconnect = () => {
    gDrive.logout();
    setIsGDriveConnected(false);
  };

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

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20 text-left bg-transparent">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white">Admin Dashboard</h2>
          <p className="text-gray-400 font-medium tracking-tight">"Managing Client Risk Like A Boss"</p>
        </div>
        <div className="flex bg-white/5 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 overflow-x-auto">
          <button onClick={() => setActiveTab('policies')} className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'policies' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}>Policy Audits</button>
          <button onClick={() => setActiveTab('leads')} className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'leads' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}>Smart Leads ({leads.length})</button>
          <button onClick={() => setActiveTab('sync')} className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'sync' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}>Cloud Sync</button>
          <button onClick={() => setActiveTab('data')} className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'data' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}>Vault Data</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Audits" value={stats.totalPolicies} icon="file-text" color="gray" />
        <StatCard title="Smart Leads" value={stats.totalLeads} icon="trending-up" color="blue" />
        <StatCard title="High Risk" value={stats.needsReview} icon="x-circle" color="red" />
        <StatCard title="Solid Risk" value={stats.goodPolicies} icon="check-circle" color="green" />
      </div>

      {activeTab === 'policies' && (
        <div className="bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <h3 className="font-bold text-xl tracking-tighter text-white">Policy Review Vault</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 text-[10px] font-bold tracking-widest border-b border-white/5 bg-black/40">
                  <th className="px-8 py-5 uppercase">Insured Name</th>
                  <th className="px-8 py-5 uppercase">Policy Info</th>
                  <th className="px-8 py-5 uppercase">Status</th>
                  <th className="px-8 py-5 uppercase">Score</th>
                  <th className="px-8 py-5 text-right uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
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
                        <span className="inline-block px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-black text-gray-400 border border-white/10 tracking-tighter">{p.type || 'Unknown'}</span>
                        {p.policyNumber && <div className="text-[10px] text-gray-500 font-mono">#{p.policyNumber}</div>}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest ${p.rating === 'Good' ? 'bg-green-500/10 text-green-400' : p.rating === 'Needs Improvement' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>{p.rating}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-16 bg-white/5 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full ${p.score >= 7 ? 'bg-green-400' : p.score >= 4 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${Math.min(p.score * 10, 100)}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-400 font-bold">{p.score.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => onViewPolicy(p)} className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => onDeletePolicy(p.id)} className="p-2.5 rounded-xl bg-red-500/5 text-gray-500 hover:text-red-400 transition-all border border-red-500/10">
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

      {activeTab === 'sync' && (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-top-4">
          <div className="bg-black/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 space-y-8 text-center shadow-2xl">
            <div className="w-20 h-20 bg-blue-400/10 text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-400/20">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
            </div>
            <h3 className="text-3xl font-black tracking-tighter text-white">Cloud Sync (Google Drive)</h3>
            <p className="text-gray-400 font-medium leading-relaxed">Connect your Google Drive to automatically mirror all Audit PDFs to the <span className="text-white font-bold">"Policies"</span> folder and lead data to the <span className="text-white font-bold">"Smart Leads"</span> folder. This ensures your data survives Incognito sessions.</p>
            
            <div className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 tracking-widest px-1 uppercase">Google Client ID</label>
                <input 
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Paste your Google Client ID here..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-yellow-400 transition-all text-white text-sm placeholder:text-gray-700"
                />
              </div>

              {isGDriveConnected ? (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl flex items-center justify-center gap-4 text-green-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span className="font-black tracking-widest text-xs uppercase">Google Drive Connected & Syncing</span>
                  </div>
                  <button onClick={handleGDriveDisconnect} className="w-full bg-red-500/10 text-red-400 border border-red-500/20 px-8 py-4 rounded-2xl font-black tracking-wider hover:bg-red-500/20 transition-all text-xs uppercase">Disconnect</button>
                </div>
              ) : (
                <button onClick={handleGDriveConnect} className="w-full bg-white text-black px-8 py-5 rounded-2xl font-black tracking-wider hover:bg-gray-200 transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95">
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                  Connect Google Drive
                </button>
              )}
            </div>
            
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Client ID Required for first-time setup</p>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4">
          <div className="bg-black/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 space-y-8 text-center shadow-2xl">
            <div className="w-20 h-20 bg-yellow-400/10 text-yellow-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-yellow-400/20">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="text-3xl font-black tracking-tighter text-white">Boss Security Vault</h3>
            <p className="text-gray-400 leading-relaxed font-medium text-left bg-white/5 p-4 rounded-xl border border-white/5">Note: Data in the local vault is stored on this browser only. For permanent cross-device access, use the <span className="text-blue-400 font-bold">Cloud Sync</span> feature.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={handleExportBackup} className="bg-yellow-400 text-black px-8 py-5 rounded-2xl font-black hover:bg-yellow-500 transition-all flex items-center justify-center gap-3">Export Vault</button>
              <button onClick={handleImportBackup} className="bg-white/5 text-white border border-white/10 px-8 py-5 rounded-2xl font-black hover:bg-white/10 transition-all flex items-center justify-center gap-3">Restore Vault</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number; icon: string; color: string }> = ({ title, value, icon, color }) => {
  const colorMap: any = {
    yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    gray: 'text-gray-300 bg-white/10 border-white/10'
  };

  return (
    <div className="bg-black/20 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex items-center justify-between group hover:border-white/30 transition-all duration-300 shadow-xl">
      <div className="space-y-1">
        <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">{title}</p>
        <p className="text-4xl font-black text-white">{value}</p>
      </div>
      <div className={`p-3 rounded-2xl border ${colorMap[color]} group-hover:scale-110 transition-transform duration-500`}>
        {icon === 'file-text' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        {icon === 'trending-up' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        {icon === 'check-circle' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        {icon === 'x-circle' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      </div>
    </div>
  );
};

export default AdminDashboard;
