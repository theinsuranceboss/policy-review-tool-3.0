
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
import { gDrive } from './services/googleDriveService';

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
        const p = await storage.getPolicies();
        const l = await storage.getLeads();
        setAllPolicies(p);
        setAllLeads(l);
        setIsDataLoaded(true);
      } catch (err) {
        console.error("Failed to load vault:", err);
      }
    };
    loadData();
  }, []);

  const handleNewAnalysis = async (analysis: PolicyAnalysis, userDetails?: { name: string; email: string }) => {
    // 1. Save to Local Vault
    await storage.savePolicy(analysis);
    setAllPolicies(prev => [analysis, ...prev]);

    // 2. Mirror to Google Drive if connected
    if (gDrive.isConnected()) {
      try {
        await gDrive.uploadFile(
          `${analysis.insuredName}_${analysis.policyNumber || analysis.id}.pdf`,
          'Policies',
          `data:application/pdf;base64,${analysis.fileData}`,
          'application/pdf'
        );
      } catch (e) {
        console.warn("GDrive Policy Sync Failed", e);
      }
    }

    // 3. Create Smart Lead automatically from analysis
    const addressParts = (analysis.insuredAddress || '').split(',');
    const cityStateZip = addressParts[addressParts.length - 1]?.trim() || '';
    const zipMatch = cityStateZip.match(/\d{5}/);
    const stateMatch = cityStateZip.match(/[A-Z]{2}/);
    
    const autoLead: QuoteRequest = {
      id: `auto-${analysis.id}`,
      submissionDate: new Date().toLocaleString(),
      status: 'New',
      businessName: analysis.insuredName,
      fein: analysis.fein || 'EXTRACTED',
      yearsInBusiness: 'EXTRACTED',
      address1: analysis.insuredAddress || '',
      city: addressParts.length > 1 ? addressParts[addressParts.length-2]?.trim() : 'EXTRACTED',
      state: stateMatch ? stateMatch[0] : 'EXTRACTED',
      zip: zipMatch ? zipMatch[0] : 'EXTRACTED',
      country: 'United States',
      industries: analysis.industry ? [analysis.industry] : ['Extracted from Policy'],
      hasActiveCoverage: true,
      knowsPremium: false,
      hasDeclPage: true,
      contactName: userDetails?.name || analysis.insuredName || 'Insured Entity',
      contactEmail: userDetails?.email || analysis.contactEmail || '',
      contactPhone: analysis.contactPhone || '',
      extractedCoverage: analysis.coverageLimits.map(l => `${l.label}: ${l.limit}`).join('\n'),
      sourcePolicyId: analysis.id
    };

    await handleNewLead(autoLead);
    setCurrentAnalysis(analysis);
  };

  const handleNewLead = async (lead: QuoteRequest) => {
    // 1. Save to Local Vault
    await storage.saveLead(lead);
    setAllLeads(prev => {
      const filtered = prev.filter(l => l.id !== lead.id);
      return [lead, ...filtered];
    });

    // 2. Mirror to Google Drive if connected
    if (gDrive.isConnected()) {
      try {
        await gDrive.uploadFile(
          `Lead_${lead.businessName}_${lead.id}.json`,
          'Smart Leads',
          JSON.stringify(lead, null, 2),
          'application/json'
        );
      } catch (e) {
        console.warn("GDrive Lead Sync Failed", e);
      }
    }
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
          Initializing Vault...
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className={`min-h-screen bg-transparent text-white selection:bg-yellow-500/30 border-none`}>
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
