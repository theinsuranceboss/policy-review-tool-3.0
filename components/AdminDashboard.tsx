
import React, { useMemo, useState, useEffect } from 'react';
import { PolicyAnalysis, AdminStats, QuoteRequest } from '../types';
import { bossServer } from '../services/serverService';

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
  const [activeTab, setActiveTab] = useState<'policies' | 'leads' | 'activity'>('policies');
  const [serverStatus, setServerStatus] = useState(bossServer.getStatus());

  useEffect(() => {
    bossServer.onStatusChange(() => {
      setServerStatus(bossServer.getStatus());
    });
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

  const activityLog = useMemo(() => {
    const all = [
      ...policies.map(p => ({ id: p.id, type: 'Audit', title: p.insuredName, date: p.uploadDate, status: p.rating })),
      ...leads.map(l => ({ id: l.id, type: 'Lead', title: l.businessName, date: l.submissionDate, status: l.status }))
    ];
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }, [policies, leads]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20 text-left bg-transparent">
      
      {/* GLOBAL COMMAND HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-white">Staff Vault</h2>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Command Center Access</p>
          </div>
          
          <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all duration-700 ${serverStatus === 'Online' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${serverStatus === 'Online' ? 'bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${serverStatus === 'Online' ? 'text-green-400' : 'text-red-400'}`}>
              Server Authority: {serverStatus}
            </span>
          </div>
        </div>

        <div className="flex bg-white/5 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 overflow-x-auto shadow-2xl">
          <button onClick={() => setActiveTab('policies')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap tracking-widest uppercase ${activeTab === 'policies' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>Audits</button>
          <button onClick={() => setActiveTab('leads')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap tracking-widest uppercase ${activeTab === 'leads' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>Leads ({leads.length})</button>
          <button onClick={() => setActiveTab('activity')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap tracking-widest uppercase ${activeTab === 'activity' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>Activity</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Audits" value={stats.totalPolicies} color="gray" />
        <StatCard title="New Leads" value={leads.filter(l => l.status === 'New').length} color="blue" />
        <StatCard title="High Risk Clients" value={stats.needsReview} color="red" />
        <StatCard title="Live Server" value={100} isPercent color="green" />
      </div>

      {activeTab === 'policies' && (
        <div className="bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <h3 className="font-bold text-xl tracking-tighter text-white">Policy Audit Vault</h3>
            <div className="flex items-center gap-3">
               <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Auto-Synced</span>
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 text-[10px] font-bold tracking-widest border-b border-white/5 bg-black/40">
                  <th className="px-8 py-5 uppercase">Insured</th>
                  <th className="px-8 py-5 uppercase">Policy</th>
                  <th className="px-8 py-5 uppercase">Rating</th>
                  <th className="px-8 py-5 uppercase">Boss Score</th>
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

      {activeTab === 'leads' && (
        <div className="bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <h3 className="font-bold text-xl tracking-tighter text-white">Global Lead Authority</h3>
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
                      <div className="text-sm font-bold text-white">{l.businessName}</div>
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
                         <option value="New">New Lead</option>
                         <option value="In Review">Under Review</option>
                         <option value="Quoted">Quoted</option>
                         <option value="Closed">Closed Box</option>
                       </select>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button onClick={() => onDeleteLead(l.id)} className="p-2.5 rounded-xl bg-red-500/5 text-gray-600 hover:text-red-400 border border-red-500/10 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-top-4">
          <div className="bg-black/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter text-white mb-8">Live Activity Log</h3>
            <div className="space-y-4">
              {activityLog.map((log, i) => (
                <div key={log.id} className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl group hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] tracking-widest uppercase border ${log.type === 'Audit' ? 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400' : 'bg-blue-400/10 border-blue-400/20 text-blue-400'}`}>
                      {log.type.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{log.title}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">New {log.type} Received</p>
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

const StatCard: React.FC<{ title: string; value: number; color: 'gray' | 'blue' | 'green' | 'red'; isPercent?: boolean }> = ({ title, value, color, isPercent }) => {
  const colorMap: any = {
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-blue-400/5',
    green: 'text-green-400 bg-green-500/10 border-green-500/20 shadow-green-500/5',
    red: 'text-red-400 bg-red-500/10 border-red-500/20 shadow-red-500/5',
    gray: 'text-gray-300 bg-white/5 border-white/10 shadow-black/20'
  };

  return (
    <div className="bg-black/30 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 flex flex-col gap-1 shadow-xl group hover:border-white/20 transition-all">
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
