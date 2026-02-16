
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
  
  // Premium User Management
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

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20 text-left bg-transparent relative">
      
      {/* GLOBAL COMMAND HEADER */}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total audits" value={stats.totalPolicies} color="gray" />
        <StatCard title="New leads" value={leads.filter(l => l.status === 'New').length} color="blue" />
        <StatCard title="High risk clients" value={stats.needsReview} color="red" />
        <StatCard title="Recycled items" value={recycledLeads.length + recycledPolicies.length} color="red" />
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
                  <th className="px-8 py-5 uppercase">Insured</th>
                  <th className="px-8 py-5 uppercase">Policy</th>
                  <th className="px-8 py-5 uppercase">Rating</th>
                  <th className="px-8 py-5 uppercase">Boss score</th>
                  <th className="px-8 py-5 text-right uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {policies.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-500 font-bold italic tracking-wider uppercase text-xs">Waiting for incoming audits...</td></tr>
                ) : policies.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{p.insuredName || 'N/A'}</div>
                      <div className="text-[10px] text-gray-600 font-mono tracking-tighter truncate max-w-[150px] uppercase">Ref: {p.id}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-block px-3 py-1 rounded-lg bg-white/5 text-[10px] font-black text-gray-400 border border-white/5">{p.type || 'Standard'}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${p.rating === 'Good' ? 'bg-green-500/10 text-green-400' : p.rating === 'Needs Improvement' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>{p.rating}</span>
                    </td>
                    <td className="px-8 py-6 font-black text-white text-lg">{p.score.toFixed(1)}</td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
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

      {activeTab === 'premium' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-top-4">
          
          {/* PENDING REQUESTS SECTION */}
          <div className="bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-yellow-400/20 p-10 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-8 uppercase tracking-widest flex items-center gap-3">
              Pending Access Requests
              <span className="px-2 py-0.5 rounded bg-yellow-400 text-black text-[10px] font-black">{premiumRequests.length}</span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 text-[10px] font-bold tracking-widest border-b border-white/5 bg-black/40">
                    <th className="px-8 py-5 uppercase">Proposed User</th>
                    <th className="px-8 py-5 uppercase">Proposed Pass</th>
                    <th className="px-8 py-5 uppercase">Email</th>
                    <th className="px-8 py-5 text-right uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {premiumRequests.length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-12 text-center text-gray-500 font-bold italic uppercase text-[10px]">No pending requests</td></tr>
                  ) : premiumRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-yellow-400/[0.02] transition-colors group">
                      <td className="px-8 py-5 text-sm font-bold text-white">{r.username}</td>
                      <td className="px-8 py-5 text-sm font-mono text-gray-400">{r.password}</td>
                      <td className="px-8 py-5 text-[10px] text-gray-500 font-black uppercase">{r.email}</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleApproveRequest(r)} className="px-4 py-2 rounded-xl bg-yellow-400 text-black border border-yellow-400/20 text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 transition-all">Approve</button>
                          <button onClick={() => onDeletePremiumRequest(r.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-10 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-8 uppercase tracking-widest">Premium access management</h3>
            
            <form onSubmit={handleCreatePremiumUser} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              <input 
                type="text" 
                placeholder="Username" 
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-400 outline-none text-white"
              />
              <input 
                type="text" 
                placeholder="Password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-400 outline-none text-white"
              />
              <button 
                type="submit"
                className="bg-yellow-400 text-black font-black py-3 rounded-xl hover:bg-yellow-500 transition-all uppercase text-[10px] tracking-widest"
              >
                Create credentials
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 text-[10px] font-bold tracking-widest border-b border-white/5 bg-black/40">
                    <th className="px-8 py-5 uppercase">Username</th>
                    <th className="px-8 py-5 uppercase">Password</th>
                    <th className="px-8 py-5 uppercase">Created</th>
                    <th className="px-8 py-5 text-right uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {premiumUsers.length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-12 text-center text-gray-500 font-bold italic uppercase text-[10px]">No premium users created</td></tr>
                  ) : premiumUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="px-8 py-5 text-sm font-bold text-white">{u.username}</td>
                      <td className="px-8 py-5 text-sm font-mono text-gray-400">{u.password}</td>
                      <td className="px-8 py-5 text-[10px] text-gray-500 font-black uppercase">{u.createdAt}</td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => handleDeletePremiumUser(u.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <div className="bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <h3 className="font-bold text-xl tracking-tighter text-white">Global lead authority</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 text-[10px] font-bold tracking-widest border-b border-white/5 bg-black/40">
                  <th className="px-8 py-5 uppercase">Business</th>
                  <th className="px-8 py-5 uppercase">Contact</th>
                  <th className="px-8 py-5 uppercase">Workflow</th>
                  <th className="px-8 py-5 text-right uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-500 font-bold italic tracking-wider uppercase text-xs">System ready. Awaiting quotes...</td></tr>
                ) : leads.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors cursor-pointer" onClick={() => setSelectedLead(l)}>{l.businessName}</div>
                      <div className="text-[10px] text-gray-600 font-medium">{l.city || 'Central System'}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-white">{l.contactName}</div>
                      <div className="text-[10px] text-gray-500 font-mono lowercase tracking-tighter">{l.contactEmail}</div>
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

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-12 relative shadow-2xl custom-scrollbar text-left">
              <button 
                onClick={() => setSelectedLead(null)}
                className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="space-y-12">
                 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <h2 className="text-4xl font-black tracking-tighter text-white mb-2">{selectedLead.businessName}</h2>
                      <p className="text-yellow-400 font-black text-xs tracking-[0.3em] uppercase">Quote application details</p>
                    </div>
                    {selectedLead.sourcePolicyId && (
                      <button 
                        onClick={() => handleViewRelatedAudit(selectedLead.sourcePolicyId!)}
                        className="px-6 py-3 bg-yellow-400 text-black font-black text-[10px] tracking-widest uppercase rounded-xl hover:bg-yellow-500 transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        View related audit
                      </button>
                    )}
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
                    <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">Business location</p>
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-gray-300 font-bold leading-relaxed">
                       {selectedLead.address1}<br />
                       {selectedLead.address2 && <>{selectedLead.address2}<br /></>}
                       {selectedLead.city}, {selectedLead.state} {selectedLead.zip}<br />
                       {selectedLead.country}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">Industries</p>
                       <div className="flex flex-wrap gap-2">
                          {selectedLead.industries?.map(ind => (
                             <span key={ind} className="px-4 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 text-[10px] font-black uppercase tracking-wider">{ind}</span>
                          ))}
                          {(!selectedLead.industries || selectedLead.industries.length === 0) && <span className="text-gray-600 text-[10px] uppercase font-bold italic">No industries specified</span>}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">CSLB Classes</p>
                       <div className="flex flex-wrap gap-2">
                          {selectedLead.cslbClasses?.map(cls => (
                             <span key={cls} className="px-4 py-1.5 rounded-lg bg-blue-400/10 text-blue-400 border border-blue-400/20 text-[10px] font-black uppercase tracking-wider">{cls}</span>
                          ))}
                          {(!selectedLead.cslbClasses || selectedLead.cslbClasses.length === 0) && <span className="text-gray-600 text-[10px] uppercase font-bold italic">N/A</span>}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">Coverage analysis parameters</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <StatusBadge label="Active Coverage" value={selectedLead.hasActiveCoverage} />
                       <StatusBadge label="Knows Premium" value={selectedLead.knowsPremium} />
                       <StatusBadge label="Provided Dec Page" value={selectedLead.hasDeclPage} />
                    </div>
                 </div>

                 <div className="pt-8 border-t border-white/10 flex justify-end">
                    <button 
                       onClick={() => setSelectedLead(null)}
                       className="px-12 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-xs tracking-widest uppercase transition-all"
                    >
                       Close record
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Recycle Bin Tab */}
      {activeTab === 'recycle' && (
        <div className="bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-red-500/20 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="px-8 py-6 border-b border-red-500/10 flex items-center justify-between bg-red-500/[0.02]">
            <h3 className="font-bold text-xl tracking-tighter text-white">Recycle Bin</h3>
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
              <button onClick={() => setRecycleSubTab('leads')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${recycleSubTab === 'leads' ? 'bg-red-500 text-white' : 'text-gray-500'}`}>Leads ({recycledLeads.length})</button>
              <button onClick={() => setRecycleSubTab('audits')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${recycleSubTab === 'audits' ? 'bg-red-500 text-white' : 'text-gray-500'}`}>Audits ({recycledPolicies.length})</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {recycleSubTab === 'leads' ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 text-[10px] font-bold tracking-widest border-b border-white/5 bg-black/40">
                    <th className="px-8 py-5 uppercase">Business</th>
                    <th className="px-8 py-5 uppercase">Contact</th>
                    <th className="px-8 py-5 uppercase">Submission Date</th>
                    <th className="px-8 py-5 text-right uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recycledLeads.length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-500 font-bold italic tracking-wider uppercase text-xs">Recycle bin is empty</td></tr>
                  ) : recycledLeads.map((l) => (
                    <tr key={l.id} className="hover:bg-red-500/[0.03] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="text-sm font-bold text-white">{l.businessName}</div>
                        <div className="text-[10px] text-gray-600 font-medium">{l.city || 'Central System'}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-bold text-white">{l.contactName}</div>
                        <div className="text-[10px] text-gray-500 font-mono lowercase tracking-tighter">{l.contactEmail}</div>
                      </td>
                      <td className="px-8 py-6">
                         <span className="text-[10px] text-gray-400 font-black tracking-widest uppercase">{l.submissionDate}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => onRestoreLead(l.id)} 
                            className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-black transition-all"
                          >
                            Restore
                          </button>
                          <button 
                            onClick={() => onPermanentDeleteLead(l.id)} 
                            className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 text-[10px] font-bold tracking-widest border-b border-white/5 bg-black/40">
                    <th className="px-8 py-5 uppercase">Insured</th>
                    <th className="px-8 py-5 uppercase">Type</th>
                    <th className="px-8 py-5 uppercase">Upload Date</th>
                    <th className="px-8 py-5 text-right uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recycledPolicies.length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-500 font-bold italic tracking-wider uppercase text-xs">No recycled audits</td></tr>
                  ) : recycledPolicies.map((p) => (
                    <tr key={p.id} className="hover:bg-red-500/[0.03] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="text-sm font-bold text-white">{p.insuredName}</div>
                        <div className="text-[10px] text-gray-600 font-mono tracking-tighter uppercase">ID: {p.id}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{p.type}</span>
                      </td>
                      <td className="px-8 py-6">
                         <span className="text-[10px] text-gray-400 font-black tracking-widest uppercase">{p.uploadDate}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => onRestorePolicy(p.id)} 
                            className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-black transition-all"
                          >
                            Restore
                          </button>
                          <button 
                            onClick={() => onPermanentDeletePolicy(p.id)} 
                            className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Activity Log */}
      {activeTab === 'activity' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-top-4">
          <div className="bg-black/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter text-white mb-8">Live activity log</h3>
            <div className="space-y-4">
              {activityLog.map((log, i) => (
                <div key={log.id} className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl group hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] tracking-widest uppercase border ${log.type === 'Audit' ? 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400' : 'bg-blue-400/10 border-blue-400/20 text-blue-400'}`}>
                      {log.type.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{log.title}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">New {log.type} received</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{log.date}</p>
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${log.status === 'Poor' || log.status === 'New' ? 'text-red-400' : 'text-green-400'}`}>{log.status}</p>
                  </div>
                </div>
              ))}
              {activityLog.length === 0 && (
                <p className="text-center text-gray-600 font-bold tracking-widest py-10 uppercase text-xs italic">Awaiting activity from customers...</p>
              )}
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
      <p className="font-bold text-white text-lg tracking-tight">{value || 'N/A'}</p>
   </div>
);

const StatusBadge: React.FC<{ label: string; value?: boolean }> = ({ label, value }) => (
   <div className={`p-4 rounded-2xl border flex items-center justify-between ${value ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
      <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
      {value ? (
         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      ) : (
         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
      )}
   </div>
);

const StatCard: React.FC<{ title: string; value: number; color: 'gray' | 'blue' | 'green' | 'red'; isPercent?: boolean }> = ({ title, value, color, isPercent }) => {
  const colorMap: any = {
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-blue-400/5',
    green: 'text-green-400 bg-green-500/10 border-green-500/20 shadow-green-500/5',
    red: 'text-red-400 bg-red-500/10 border-red-500/20 shadow-red-500/5',
    gray: 'text-gray-300 bg-white/5 border-white/10 shadow-black/20'
  };

  return (
    <div className="bg-black/30 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 flex flex-col gap-1 shadow-xl group hover:border-white/20 transition-all text-left">
      <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em]">{title}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-4xl font-black text-white">{value}</p>
        {isPercent && <span className="text-lg font-black text-gray-600 tracking-tighter uppercase">%</span>}
      </div>
      <div className={`mt-4 w-full h-1 rounded-full overflow-hidden bg-white/5 border border-white/5`}>
        <div className={`h-full ${colorMap[color].split(' ')[0]} animate-pulse`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
};

export default AdminDashboard;
