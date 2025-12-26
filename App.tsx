
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import Header from './components/Header';
import UploadSection from './components/UploadSection';
import AnalysisResult from './components/AnalysisResult';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import WizardForm from './components/WizardForm';
import { PolicyAnalysis, QuoteRequest } from './types';
import { storage } from './services/storage';
import { bossServer } from './services/serverService';

const { HashRouter, Routes, Route } = ReactRouterDOM;

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [allPolicies, setAllPolicies] = useState<PolicyAnalysis[]>([]);
  const [allLeads, setAllLeads] = useState<QuoteRequest[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<PolicyAnalysis | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const embedMode = params.get('embed') === 'true' || window.location.href.includes('embed=true');
    setIsEmbedded(embedMode);
    
    const loadData = async () => {
      try {
        // Sync with Central Vault on load
        const cloudData = await bossServer.fetchGlobalVault();
        
        // Merge with local storage
        for (const p of cloudData.policies) await storage.savePolicy(p);
        for (const l of cloudData.leads) await storage.saveLead(l);

        const p = await storage.getPolicies();
        const l = await storage.getLeads();
        setAllPolicies(p);
        setAllLeads(l);
        setIsDataLoaded(true);
      } catch (err) {
        console.error("Failed to sync with Boss Central Server:", err);
      }
    };
    loadData();
  }, []);

  const handleNewAnalysis = async (analysis: PolicyAnalysis, userDetails?: { name: string; email: string }) => {
    // 1. Save locally for the user
    await storage.savePolicy(analysis);
    setAllPolicies(prev => [analysis, ...prev]);

    // 2. AUTOMATIC UPSTREAM TO BOSS SERVER (Silent)
    await bossServer.upstream('policy', analysis);

    // 3. Create Smart Lead automatically from analysis
    const autoLead: QuoteRequest = {
      id: `auto-${analysis.id}`,
      submissionDate: new Date().toLocaleString(),
      status: 'New',
      businessName: analysis.insuredName,
      fein: analysis.fein || 'EXTRACTED',
      yearsInBusiness: 'EXTRACTED',
      address1: analysis.insuredAddress || '',
      city: 'EXTRACTED',
      state: 'EXTRACTED',
      zip: 'EXTRACTED',
      country: 'United States',
      industries: analysis.industry ? [analysis.industry] : ['Policy Audit'],
      hasActiveCoverage: true,
      knowsPremium: false,
      hasDeclPage: true,
      contactName: userDetails?.name || analysis.insuredName || 'Insured',
      contactEmail: userDetails?.email || analysis.contactEmail || '',
      contactPhone: analysis.contactPhone || '',
      sourcePolicyId: analysis.id
    };

    await handleNewLead(autoLead);
    setCurrentAnalysis(analysis);
  };

  const handleNewLead = async (lead: QuoteRequest) => {
    await storage.saveLead(lead);
    setAllLeads(prev => {
      const filtered = prev.filter(l => l.id !== lead.id);
      return [lead, ...filtered];
    });

    // AUTOMATIC UPSTREAM TO BOSS SERVER (Silent)
    await bossServer.upstream('lead', lead);
  };

  const handleDeletePolicy = async (id: string) => {
    await storage.deletePolicy(id);
    setAllPolicies(prev => prev.filter(p => p.id !== id));
  };

  const handleDeleteLead = async (id: string) => {
    await storage.deleteLead(id);
    setAllLeads(prev => prev.filter(l => l.id !== id));
  };

  const handleStatusChange = async (id: string, status: QuoteRequest['status']) => {
    const lead = allLeads.find(l => l.id === id);
    if (lead) {
      const updated = { ...lead, status };
      await storage.saveLead(updated);
      setAllLeads(prev => prev.map(l => l.id === id ? updated : l));
      await bossServer.upstream('lead', updated);
    }
  };

  const handleImport = async (json: string) => {
    await storage.importBackup(json);
    const p = await storage.getPolicies();
    const l = await storage.getLeads();
    setAllPolicies(p);
    setAllLeads(l);
  };

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-yellow-400 font-black text-2xl animate-pulse tracking-tighter uppercase">
          Handshaking With Boss Server...
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-transparent text-white border-none">
        {!isEmbedded && (
          <Header 
            isAdmin={isAdmin} 
            setIsAdmin={setIsAdmin} 
            onOpenWizard={() => { setCurrentAnalysis(null); setShowWizard(true); }} 
            onGoHome={() => { setCurrentAnalysis(null); setShowWizard(false); }}
          />
        )}
        
        <main className={`container mx-auto px-4 max-w-6xl bg-transparent ${isEmbedded ? 'py-0' : 'py-8'}`}>
          <Routes>
            <Route path="/" element={
              showWizard ? (
                <WizardForm onSubmit={handleNewLead} onCancel={() => setShowWizard(false)} />
              ) : currentAnalysis ? (
                <AnalysisResult 
                  analysis={currentAnalysis} 
                  onReset={() => setCurrentAnalysis(null)} 
                  onOpenWizard={() => setShowWizard(true)}
                />
              ) : (
                <UploadSection 
                  onAnalysisComplete={handleNewAnalysis} 
                  existingPolicies={allPolicies}
                  onOpenWizard={() => setShowWizard(true)}
                />
              )
            } />
            
            <Route path="/admin" element={
              isAdmin ? (
                <AdminDashboard 
                  policies={allPolicies} 
                  leads={allLeads}
                  onDeletePolicy={handleDeletePolicy}
                  onDeleteLead={handleDeleteLead}
                  onStatusChange={handleStatusChange}
                  onImport={handleImport}
                  onViewPolicy={(p) => {
                    setCurrentAnalysis(p);
                    setShowWizard(false);
                    window.location.hash = '#/';
                  }}
                />
              ) : (
                <AdminLogin onLogin={() => setIsAdmin(true)} />
              )
            } />
          </Routes>
        </main>

        {!isEmbedded && (
          <footer className="py-12 border-none text-center text-gray-500 text-sm bg-transparent">
            <p>© {new Date().getFullYear()} The Insurance Boss Policy Review Tool.</p>
          </footer>
        )}
      </div>
    </HashRouter>
  );
};

export default App;
