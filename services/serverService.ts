
import { PolicyAnalysis, QuoteRequest } from '../types';

/**
 * Boss Central Server Service
 * Handles the "Global Vault" logic. In a production environment, 
 * these methods would call your private REST API (e.g., https://api.theinsuranceboss.com/vault)
 */
class BossServerService {
  private isOnline: boolean = true;
  private syncListeners: (() => void)[] = [];

  constructor() {
    // Simulate server heartbeat
    setInterval(() => {
      this.isOnline = navigator.onLine;
      this.notifyListeners();
    }, 5000);
  }

  private notifyListeners() {
    this.syncListeners.forEach(l => l());
  }

  onStatusChange(callback: () => void) {
    this.syncListeners.push(callback);
  }

  getStatus() {
    return this.isOnline ? 'Online' : 'Offline';
  }

  /**
   * Pushes a new submission to the global authority
   */
  async upstream(type: 'policy' | 'lead', data: any) {
    console.log(`[Boss Server] Up-streaming ${type}:`, data.id);
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In a real server setup:
    // await fetch('/api/vault/push', { method: 'POST', body: JSON.stringify({ type, data }) });
    
    // For now, we utilize the local storage as a "Server Mirror" 
    // to ensure the Boss can see data across sessions on the same domain.
    const serverKey = `boss_central_vault_${type}s`;
    const existing = JSON.parse(localStorage.getItem(serverKey) || '[]');
    const updated = [data, ...existing.filter((item: any) => item.id !== data.id)];
    localStorage.setItem(serverKey, JSON.stringify(updated));
    
    return { success: true, timestamp: new Date().toISOString() };
  }

  /**
   * Fetches all submissions from the global authority for the Boss/Staff
   */
  async fetchGlobalVault() {
    console.log('[Boss Server] Refreshing Global Vault Data...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const policies = JSON.parse(localStorage.getItem('boss_central_vault_policys') || '[]');
    const leads = JSON.parse(localStorage.getItem('boss_central_vault_leads') || '[]');
    
    return { policies, leads };
  }
}

export const bossServer = new BossServerService();
