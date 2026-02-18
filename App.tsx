import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import Header from './components/Header';
import UploadSection from './components/UploadSection';
import AnalysisResult from './components/AnalysisResult';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import WizardForm from './components/WizardForm';
import Gatekeeper from './components/Gatekeeper';
import { PolicyAnalysis, QuoteRequest, PremiumRequest } from './types';
import { storage } from './services/storage';
import { bossServer } from './services/serverService';

const { HashRouter, Routes, Route } = ReactRouterDOM;

// Wrapper to handle main app view states - strictly unmounts protected content
const MainView: React.FC<{
  isUnlocked: boolean,
  onUnlock: () => void,
  showWizard: boolean,
  setShowWizard: (v: boolean) => void,
  allPolicies: PolicyAnalysis[],
  currentAnalysis: PolicyAnalysis | null,
  handleNewAnalysis: (a: PolicyAnalysis, details: {name: string, email: string}) => void,
  handleNewLead: (l: QuoteRequest) => void,
  handleNewPremiumRequest: (r: PremiumRequest) => void,
  setCurrentAnalysis: (a: PolicyAnalysis | null) => void,
  onReset: () => void,
  auditCount: number,
  isAdmin?: boolean;
}> = ({ isUnlocked, onUnlock, showWizard, setShowWizard, allPolicies, currentAnalysis, handleNewAnalysis, handleNewLead, handleNewPremiumRequest, setCurrentAnalysis, onReset, auditCount, isAdmin }) => {
  
  // Gatekeeper: MANDATORY ENTRY POINT
  if (!isUnlocked) {
    return <Gatekeeper onUnlock={onUnlock} />;
  }

  // PROTECTED CONTENT: Only mounted after successful verification
  if (showWizard) {
    return <WizardForm onSubmit={handleNewLead} onCancel={onReset} />;
  }

  if (currentAnalysis) {
    return (
      <AnalysisResult 
        analysis={currentAnalysis} 
        onReset={onReset} 
        onOpenWizard={() => setShowWizard(true)}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <UploadSection 
      onAnalysisComplete={handleNewAnalysis} 
      existingPolicies={allPolicies}
      onOpenWizard={() => setShowWizard(true)}
      onPremiumRequest={handleNewPremiumRequest}
      auditCount={auditCount}
    />
  );
};

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [allPolicies, setAllPolicies] = useState<PolicyAnalysis[]>([]);
  const [allLeads, setAllLeads] = useState<QuoteRequest[]>([]);
  const [recycledLeads, setRecycledLeads] = useState<QuoteRequest[]>([]);
  const [recycledPolicies, setRecycledPolicies] = useState<PolicyAnalysis[]>([]);
  const [premiumRequests, setPremiumRequests] = useState<PremiumRequest[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<PolicyAnalysis | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [auditCount, setAuditCount] = useState(0);

  useEffect(() => {
    // Session-based locking protocol
    const unlocked = sessionStorage.getItem('boss_tool_unlocked') === 'true';
    setIsUnlocked(unlocked);

    const count = parseInt(sessionStorage.getItem('boss_audit_count') || '0', 10);
    setAuditCount(count);

    const params = new URLSearchParams(window.location.search);
    const embedMode = params.get('embed') === 'true' || window.location.href.includes('embed=true');
    setIsEmbedded(embedMode);
    
    const loadData = async () => {
      try {
        const cloudData = await bossServer.fetchGlobalVault();
        if (cloudData.policies) {
          for (const p of cloudData.policies) await storage.savePolicy(p);
        }
        if (cloudData.leads) {
          for (const l of cloudData.leads) await storage.saveLead(l);
        }

        const p = await storage.getPolicies();
        const l = await storage.getLeads();
        const rl = await storage.getRecycledLeads();
        const rp = await storage.getRecycledPolicies();
        const pr = await storage.getPremiumRequests();
        setAllPolicies(p);
        setAllLeads(l);
        setRecycledLeads(rl);
        setRecycledPolicies(rp);
        setPremiumRequests(pr);
      } catch (err) {
        console.error("Sync Notification:", err);
      }
    };
    loadData();
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
    sessionStorage.setItem('boss_tool_unlocked', 'true');
    // Unified Cinematic Handshake
    alert("Connection established. Authority verified. The terminal is now active for policy auditing.");
  };

  const lockApp = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('boss_tool_unlocked');
    setCurrentAnalysis(null);
    setShowWizard(false);
  };

  const handleGoHome = () => {
    // Protocol requires re-locking on home return
    lockApp();
    window.location.hash = '#/';
  };

  const handleNewSession = () => {
    lockApp();
  };

  const handleNewAnalysis = async (analysis: PolicyAnalysis, details: {name: string, email: string}) => {
    const newCount = auditCount + 1;
    setAuditCount(newCount);
    sessionStorage.setItem('boss_audit_count', newCount.toString());

    setCurrentAnalysis(analysis);
    setShowWizard(false);

    storage.savePolicy(analysis).then(() => {
      setAllPolicies(prev => {
        const exists = prev.some(p => p.id === analysis.id);
        return exists ? prev : [analysis, ...prev];
      });
      bossServer.upstream('policy', analysis);
    });

    const autoLead: QuoteRequest = {
      id: `auto-${analysis.id}`,
      submissionDate: new Date().toLocaleString(),
      status: 'New',
      businessName: analysis.insuredName || details.name,
      fein: analysis.fein || 'EXTRACTED',
      yearsInBusiness: 'EXTRACTED',
      address1: analysis.insuredAddress || '',
      city: 'EXTRACTED',
      state: 'EXTRACTED',
      zip: 'EXTRACTED',
      country: 'United States',
      industries: analysis.industry ? [analysis.industry] : ['Policy Audit'],
      hasActiveCoverage: true,
      knowsPremium: !!analysis.premiumAmount,
      hasDeclPage: true,
      contactName: details.name || analysis.insuredName || 'Insured',
      contactEmail: details.email || analysis.contactEmail || '',
      contactPhone: analysis.contactPhone || '',
      sourcePolicyId: analysis.id,
      extractedCoverage: analysis.summary
    };

    handleNewLead(autoLead);
  };

  const handleNewLead = async (lead: QuoteRequest) => {
    setAllLeads(prev => {
      const filtered = prev.filter(l => l.id !== lead.id);
      return [lead, ...filtered];
    });
    storage.saveLead(lead);
    bossServer.upstream('lead', lead);
  };

  const handleNewPremiumRequest = async (request: PremiumRequest) => {
    await storage.savePremiumRequest(request);
    setPremiumRequests(prev => [request, ...prev]);
  };

  const handleDeletePolicy = async (id: string) => {
    const policyToRecycle = allPolicies.find(p => p.id === id);
    if (policyToRecycle) {
      await storage.moveToRecyclePolicy(policyToRecycle);
      setAllPolicies(prev => prev.filter(p => p.id !== id));
      setRecycledPolicies(prev => [policyToRecycle, ...prev]);
    }
  };

  const handleRestorePolicy = async (id: string) => {
    const policyToRestore = recycledPolicies.find(p => p.id === id);
    if (policyToRestore) {
      await storage.restoreFromRecyclePolicy(policyToRestore);
      setRecycledPolicies(prev => prev.filter(p => p.id !== id));
      setAllPolicies(prev => [policyToRestore, ...prev]);
    }
  };

  const handlePermanentDeletePolicy = async (id: string) => {
    await storage.permanentDeletePolicy(id);
    setRecycledPolicies(prev => prev.filter(p => p.id !== id));
  };

  const handleDeleteLead = async (id: string) => {
    const leadToRecycle = allLeads.find(l => l.id === id);
    if (leadToRecycle) {
      await storage.moveToRecycle(leadToRecycle);
      setAllLeads(prev => prev.filter(l => l.id !== id));
      setRecycledLeads(prev => [leadToRecycle, ...prev]);
    }
  };

  const handleRestoreLead = async (id: string) => {
    const leadToRestore = recycledLeads.find(l => l.id === id);
    if (leadToRestore) {
      await storage.restoreFromRecycle(leadToRestore);
      setRecycledLeads(prev => prev.filter(l => l.id !== id));
      setAllLeads(prev => [leadToRestore, ...prev]);
    }
  };

  const handlePermanentDeleteLead = async (id: string) => {
    await storage.permanentDeleteLead(id);
    setRecycledLeads(prev => prev.filter(l => l.id !== id));
  };

  const handleDeletePremiumRequest = async (id: string) => {
    await storage.deletePremiumRequest(id);
    setPremiumRequests(prev => prev.filter(req => req.id !== id));
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
    const rl = await storage.getRecycledLeads();
    const rp = await storage.getRecycledPolicies();
    const pr = await storage.getPremiumRequests();
    setAllPolicies(p);
    setAllLeads(l);
    setRecycledLeads(rl);
    setRecycledPolicies(rp);
    setPremiumRequests(pr);
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-transparent text-white border-none">
        {!isEmbedded && (
          <Header 
            isAdmin={isAdmin} 
            setIsAdmin={setIsAdmin} 
            onOpenWizard={() => { setCurrentAnalysis(null); setShowWizard(true); }} 
            onGoHome={handleGoHome}
          />
        )}
        
        <main className={`container mx-auto px-4 max-w-6xl bg-transparent ${isEmbedded ? 'py-0' : 'py-8'}`}>
          <Routes>
            <Route path="/" element={
              <MainView 
                isUnlocked={isUnlocked}
                onUnlock={handleUnlock}
                showWizard={showWizard}
                setShowWizard={setShowWizard}
                allPolicies={allPolicies}
                currentAnalysis={currentAnalysis}
                handleNewAnalysis={handleNewAnalysis}
                handleNewLead={handleNewLead}
                handleNewPremiumRequest={handleNewPremiumRequest}
                setCurrentAnalysis={setCurrentAnalysis}
                onReset={handleNewSession}
                auditCount={auditCount}
                isAdmin={isAdmin}
              />
            } />
            
            <Route path="/admin" element={
              isAdmin ? (
                <AdminDashboard 
                  policies={allPolicies} 
                  leads={allLeads}
                  recycledLeads={recycledLeads}
                  recycledPolicies={recycledPolicies}
                  premiumRequests={premiumRequests}
                  onDeletePolicy={handleDeletePolicy}
                  onRestorePolicy={handleRestorePolicy}
                  onPermanentDeletePolicy={handlePermanentDeletePolicy}
                  onDeleteLead={handleDeleteLead}
                  onRestoreLead={handleRestoreLead}
                  onPermanentDeleteLead={handlePermanentDeleteLead}
                  onDeletePremiumRequest={handleDeletePremiumRequest}
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
            <p>© {new Date().getFullYear()} The Insurance Boss Authority Terminal.</p>
          </footer>
        )}
      </div>
    </HashRouter>
  );
};

export default App;