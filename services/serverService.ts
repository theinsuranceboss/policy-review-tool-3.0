
import { openDB, IDBPDatabase } from 'idb';
import { PolicyAnalysis, QuoteRequest } from '../types';

const DB_NAME = 'BossCentralServerDB';
const STORE_POLICIES = 'server_policies';
const STORE_LEADS = 'server_leads';
const DB_VERSION = 1;

/**
 * Boss Central Server Service
 * Handles the "Global Vault" logic using IndexedDB to avoid localStorage quota limits.
 */
class BossServerService {
  private isOnline: boolean = true;
  private syncListeners: (() => void)[] = [];
  private dbPromise: Promise<IDBPDatabase> | null = null;

  constructor() {
    // Simulate server heartbeat
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.isOnline = navigator.onLine;
        this.notifyListeners();
      }, 5000);
    }
  }

  private getDB() {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_POLICIES)) {
            db.createObjectStore(STORE_POLICIES, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_LEADS)) {
            db.createObjectStore(STORE_LEADS, { keyPath: 'id' });
          }
        },
      });
    }
    return this.dbPromise;
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
   * Pushes a new submission to the global authority (Simulated via IDB)
   */
  async upstream(type: 'policy' | 'lead', data: any) {
    console.log(`[Boss Server] Up-streaming ${type}:`, data.id);
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const db = await this.getDB();
      const storeName = type === 'policy' ? STORE_POLICIES : STORE_LEADS;
      await db.put(storeName, data);
      return { success: true, timestamp: new Date().toISOString() };
    } catch (err) {
      console.error(`[Boss Server] Critical Upstream Failure:`, err);
      return { success: false, error: err };
    }
  }

  /**
   * Fetches all submissions from the global authority for the Boss/Staff
   */
  async fetchGlobalVault() {
    console.log('[Boss Server] Refreshing Global Vault Data...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const db = await this.getDB();
      const policies = await db.getAll(STORE_POLICIES);
      const leads = await db.getAll(STORE_LEADS);
      
      // Sort by date descending (assuming standard string format from types)
      const sortedPolicies = policies.sort((a, b) => 
        new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime()
      );
      const sortedLeads = leads.sort((a, b) => 
        new Date(b.submissionDate || 0).getTime() - new Date(a.submissionDate || 0).getTime()
      );

      return { policies: sortedPolicies, leads: sortedLeads };
    } catch (err) {
      console.error(`[Boss Server] Vault Retrieval Failed:`, err);
      return { policies: [], leads: [] };
    }
  }
}

export const bossServer = new BossServerService();
