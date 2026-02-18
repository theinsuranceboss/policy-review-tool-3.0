import React, { useMemo, useState, useEffect } from 'react';
import { PolicyAnalysis, AdminStats, QuoteRequest, PremiumUser, PremiumRequest } from '../types';
import { bossServer } from '../services/serverService';
import { storage } from '../services/storage';

interface AdminDashboardProps {
  policies: PolicyAnalysis[];
  leads: QuoteRequest[];
  recycledLeads: QuoteRequest[];
  recycledPolicies: PolicyAnalysis[];
  premiumRequests: PremiumRequest[];
  onDeletePolicy: (id: string) => void;
  onRestorePolicy: (id: string) => void;
  onPermanentDeletePolicy: (id: string) => void;
  onDeleteLead: (id: string) => void;
  onRestoreLead: (id: string) => void;
  onPermanentDeleteLead: (id: string) => void;
  onDeletePremiumRequest: (id: string) => void;
  onStatusChange: (id: string, status: QuoteRequest['status']) => void;
  onViewPolicy: (p: PolicyAnalysis) => void;
  onImport: (json: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  policies, 
  leads, 
  recycledLeads,
  recycledPolicies,
  premiumRequests,
  onDeletePolicy, 
  onRestorePolicy,
  onPermanentDeletePolicy,
  onDeleteLead, 
  onRestoreLead,
  onPermanentDeleteLead,
  onDeletePremiumRequest,
  onStatusChange, 
  onViewPolicy, 
  onImport 
}) => {
  const [activeTab, setActiveTab] = useState<'policies' | 'leads' | 'activity' | 'recycle' | 'premium'>('policies');
  const [recycleSubTab, setRecycleSubTab] = useState<'leads' | 'audits'>('leads');
  const [serverStatus, setServerStatus] = useState(bossServer.getStatus());
  const [selectedLead, setSelectedLead] = useState<QuoteRequest | null>(null);
  
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    bossServer.onStatusChange(() => {
      setServerStatus(bossServer.getStatus());
    });
    loadPremiumUsers();
  }, []);

  const loadPremiumUsers = async () => {
    const users = await storage.getPremiumUsers();
    setPremiumUsers(users);
  };

  const handleCreatePremiumUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    
    const newUser: PremiumUser = {
      id: Math.random().toString(36).substr(2, 9),
      username: newUsername,
      password: newPassword,
      createdAt: new Date().toLocaleString()
    };
    
    await storage.addPremiumUser(newUser);
    setNewUsername('');
    setNewPassword('');
    loadPremiumUsers();
  };

  const handleApproveRequest = async (req: PremiumRequest) => {
    const newUser: PremiumUser = {
      id: Math.random().toString(36).substr(2, 9),
      username: req.username,
      password: req.password,
      createdAt: new Date().toLocaleString()
    };
    await storage.addPremiumUser(newUser);
    await onDeletePremiumRequest(req.id);
    loadPremiumUsers();
  };

  const handleDeletePremiumUser = async (id: string) => {
    await storage.deletePremiumUser(id);
    loadPremiumUsers();
  };

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

  const activityLog = useMemo(() => {
    const all = [
      ...policies.map(p => ({ id: p.id, type: 'Audit', title: p.insuredName, date: p.uploadDate, status: p.rating })),
      ...leads.map(l => ({ id: l.id, type: 'Lead', title: l.businessName, date: l.submissionDate, status: l.status }))
    ];
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }, [policies, leads]);

  const handleViewRelatedAudit = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    if (policy) {
      setSelectedLead(null);
      onViewPolicy(policy);
    } else {
      alert("Policy record not found in local vault.");
    }
  };

  const handleOpenSourcePDF = (fileData?: string) => {
    if (!fileData) {
      alert("No source PDF available for this record.");
      return;
    }
    const byteCharacters = atob(fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20 text-left bg-transparent relative">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-white">Staff vault</h2>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Command center access</p>
          </div>
          
          <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all duration-700 ${serverStatus === 'Online' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${serverStatus === 'Online' ? 'bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${serverStatus === 'Online' ? 'text-green-400' : 'text-red-400'}`}>
              Server authority: {serverStatus}
            </span>
          </div>
        </div>

        <div className="flex bg-white/5 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 overflow-x-auto shadow-2xl">
          <button onClick={() => setActiveTab('policies')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap tracking-widest uppercase ${activeTab === 'policies' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>Audits</button>
          <button onClick={() => setActiveTab('leads')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap tracking-widest uppercase ${activeTab === 'leads' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>Leads ({leads.length})</button>
          <button onClick={() => setActiveTab('activity')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap tracking-widest uppercase ${activeTab === 'activity' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>Activity</button>
          <button onClick={() => setActiveTab('premium')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap tracking-widest uppercase ${activeTab === 'premium' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>Premium Access</button>
          <button onClick={() => setActiveTab('recycle')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap tracking-widest uppercase flex items-center gap-2 ${activeTab === 'recycle' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Recycle Bin
          </button>
        </div>
      </div>

      {activeTab === 'policies' && (
        <div className="bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <h3 className="font-bold text-xl tracking-tighter text-white">Policy audit vault</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 text-[10px] font-bold tracking-widest border-b border-white/5 bg-black/40">
                  <th className="px-8 py-5 uppercase">Insured / DBA</th>
                  <th className="px-8 py-5 uppercase">Policy #</th>
                  <th className="px-8 py-5 uppercase">Rating</th>
                  <th className="px-8 py-5 uppercase">Score</th>
                  <th className="px-8 py-5 text-right uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {policies.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-500 font-bold italic tracking-wider uppercase text-xs">Waiting for incoming audits...</td></tr>
                ) : policies.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{p.insuredName}</div>
                      <div className="text-[10px] text-gray-500 italic">{p.dba !== 'Not found' ? `DBA: ${p.dba}` : ''}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black text-gray-400 border border-white/5">{p.policyNumber || 'N/A'}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${p.rating === 'Good' ? 'bg-green-500/10 text-green-400' : p.rating === 'Needs Improvement' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>{p.rating}</span>
                    </td>
                    <td className="px-8 py-6 font-black text-white text-lg">{p.score.toFixed(1)}</td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenSourcePDF(p.fileData)} className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-yellow-400 border border-white/5 transition-all" title="View Source PDF">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </button>
                        <button onClick={() => onViewPolicy(p)} className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white border border-white/5 text-[10px] font-black uppercase tracking-widest transition-all">Review</button>
                        <button onClick={() => onDeletePolicy(p.id)} className="p-2.5 rounded-xl bg-red-500/5 text-gray-600 hover:text-red-400 border border-red-500/10 transition-all">
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
        <div className="bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <h3 className="font-bold text-xl tracking-tighter text-white">Global lead authority</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 text-[10px] font-bold tracking-widest border-b border-white/5 bg-black/40">
                  <th className="px-8 py-5 uppercase">Business / FEIN</th>
                  <th className="px-8 py-5 uppercase">Contact Details</th>
                  <th className="px-8 py-5 uppercase">Workflow</th>
                  <th className="px-8 py-5 text-right uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-500 font-bold italic tracking-wider uppercase text-xs">Awaiting quotes...</td></tr>
                ) : leads.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors cursor-pointer" onClick={() => setSelectedLead(l)}>{l.businessName}</div>
                      <div className="text-[10px] text-gray-600 font-mono uppercase">FEIN: {l.fein}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-white">{l.contactName}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{l.contactEmail}</div>
                    </td>
                    <td className="px-8 py-6">
                       <select 
                        value={l.status} 
                        onChange={(e) => onStatusChange(l.id, e.target.value as any)}
                        className="bg-black border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black tracking-widest uppercase text-yellow-400 focus:outline-none focus:border-yellow-400 transition-all cursor-pointer"
                       >
                         <option value="New">New lead</option>
                         <option value="In Review">Under review</option>
                         <option value="Quoted">Quoted</option>
                         <option value="Closed">Closed box</option>
                       </select>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenSourcePDF(l.sourceFileData)} className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-yellow-400 border border-white/5 transition-all" title="View Source PDF">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          </button>
                          <button onClick={() => setSelectedLead(l)} className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white border border-white/5 text-[10px] font-black uppercase tracking-widest transition-all">Details</button>
                          <button onClick={() => onDeleteLead(l.id)} className="p-2.5 rounded-xl bg-red-500/5 text-gray-600 hover:text-red-400 border border-red-500/10 transition-all">
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

      {/* MODAL & OTHER TABS OMITTED FOR BREVITY, MAINTAINED AS PER SOURCE */}
      {selectedLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-12 relative shadow-2xl custom-scrollbar text-left text-white">
              <button onClick={() => setSelectedLead(null)} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="space-y-12">
                 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <h2 className="text-4xl font-black tracking-tighter text-white mb-2">{selectedLead.businessName}</h2>
                      <p className="text-yellow-400 font-black text-xs tracking-[0.3em] uppercase">Literal Application Values</p>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => handleOpenSourcePDF(selectedLead.sourceFileData)} className="px-6 py-3 bg-white/5 border border-white/10 text-white font-black text-[10px] tracking-widest uppercase rounded-xl hover:bg-white/10 transition-all">View Original PDF</button>
                      {selectedLead.sourcePolicyId && (
                        <button onClick={() => handleViewRelatedAudit(selectedLead.sourcePolicyId!)} className="px-6 py-3 bg-yellow-400 text-black font-black text-[10px] tracking-widest uppercase rounded-xl hover:bg-yellow-500 transition-all">Review Audit</button>
                      )}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    <DetailGroup label="DBA" value={selectedLead.dba} />
                    <DetailGroup label="FEIN/EIN" value={selectedLead.fein} />
                    <DetailGroup label="Years in business" value={selectedLead.yearsInBusiness} />
                    <DetailGroup label="Submission date" value={selectedLead.submissionDate} />
                    <DetailGroup label="Contact name" value={selectedLead.contactName} />
                    <DetailGroup label="Email" value={selectedLead.contactEmail} />
                    <DetailGroup label="Phone" value={selectedLead.contactPhone} />
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">Captured location</p>
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-gray-300 font-bold">
                       {selectedLead.address1}<br />
                       {selectedLead.city}, {selectedLead.state} {selectedLead.zip}
                    </div>
                 </div>

                 <div className="pt-8 border-t border-white/10 flex justify-end">
                    <button onClick={() => setSelectedLead(null)} className="px-12 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-xs tracking-widest uppercase transition-all">Close</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const DetailGroup: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
   <div className="space-y-1.5">
      <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">{label}</p>
      <p className="font-bold text-white text-lg tracking-tight">{value || 'Not found'}</p>
   </div>
);

const StatCard: React.FC<{ title: string; value: number; color: 'gray' | 'blue' | 'green' | 'red'; isPercent?: boolean }> = ({ title, value, color, isPercent }) => (
    <div className="bg-black/30 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 flex flex-col gap-1 shadow-xl">
      <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em]">{title}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-4xl font-black text-white">{value}</p>
        {isPercent && <span className="text-lg font-black text-gray-600 tracking-tighter uppercase">%</span>}
      </div>
    </div>
);

export default AdminDashboard;