
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

  useEffect(() => {
    setIsGDriveConnected(gDrive.isConnected());
    gDrive.init((token) => {
      setIsGDriveConnected(true);
    });
  }, []);

  const handleManualSync = () => {
    // Google policy: Popups MUST be triggered by a click.
    // This is why the 'automatic' connection was failing with a security error.
    gDrive.requestToken();
  };

  const handleLogoutDrive = () => {
    gDrive.logout();
    setIsGDriveConnected(false);
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
            <h3 className="font-bold text-xl tracking-tighter text-white">Policy Review Vault</h3>
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
                {policies.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-500 font-bold italic tracking-wider uppercase text-xs">The Vault is empty.</td></tr>
                ) : policies.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-white">{p.insuredName || 'N/A'}</div>
                      <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{p.filename}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-black text-gray-400 border border-white/10">{p.type || 'Unknown'}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest ${p.rating === 'Good' ? 'bg-green-500/10 text-green-400' : p.rating === 'Needs Improvement' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>{p.rating}</span>
                    </td>
                    <td className="px-8 py-6 font-bold text-white">{p.score.toFixed(1)}</td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => onViewPolicy(p)} className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white border border-white/5">View</button>
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
            
            <h3 className="text-3xl font-black tracking-tighter text-white">Boss Cloud Authority</h3>
            
            {isGDriveConnected ? (
              <div className="space-y-6">
                <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-3xl flex flex-col items-center gap-4 text-green-400">
                  <div className="w-12 h-12 bg-green-400/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="font-black tracking-widest text-xs uppercase text-center">Cloud Sync Is Live</span>
                </div>
                <p className="text-gray-400 text-sm font-medium">Your audits and leads are being mirrored to Google Drive.</p>
                <button onClick={handleLogoutDrive} className="text-red-400 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">Disconnect Account</button>
              </div>
            ) : (
              <div className="space-y-8">
                <p className="text-gray-400 font-medium leading-relaxed">
                  To comply with Google security policies, you must manually grant permission for the tool to save files to your Google Drive. 
                  <br/><br/>
                  Clicking the button below will open the secure authorization window.
                </p>
                <button 
                  onClick={handleManualSync}
                  className="w-full bg-white text-black px-8 py-5 rounded-2xl font-black tracking-wider hover:bg-gray-200 transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                  Activate Cloud Sync
                </button>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-loose">
                  Note: If you see a "Blocked" error, ensure your Google Cloud project has <span className="text-white">Authorized JavaScript Origins</span> set to your current URL.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4">
          <div className="bg-black/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 space-y-8 text-center shadow-2xl">
            <h3 className="text-3xl font-black tracking-tighter text-white">Vault Security</h3>
            <p className="text-gray-400 font-medium">Data is always kept in this browser's local vault. Syncing to Cloud ensures it stays safe if you clear your cache.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => {}} className="bg-yellow-400 text-black px-8 py-5 rounded-2xl font-black hover:bg-yellow-500 transition-all">Export Local Backup</button>
              <button onClick={() => {}} className="bg-white/5 text-white border border-white/10 px-8 py-5 rounded-2xl font-black hover:bg-white/10 transition-all">Import Backup</button>
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
    <div className="bg-black/20 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex items-center justify-between shadow-xl">
      <div className="space-y-1">
        <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">{title}</p>
        <p className="text-4xl font-black text-white">{value}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
