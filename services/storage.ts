
import { openDB, IDBPDatabase } from 'idb';
import { PremiumUser, PremiumRequest } from '../types';

const DB_NAME = 'TheInsuranceBossDB';
const DB_VERSION = 5; // Incrementing version for premium_requests store
const STORE_POLICIES = 'policies';
const STORE_LEADS = 'leads';
const STORE_RECYCLE_LEADS = 'recycle_leads';
const STORE_RECYCLE_POLICIES = 'recycle_policies';
const STORE_PREMIUM_USERS = 'premium_users';
const STORE_PREMIUM_REQUESTS = 'premium_requests';

let dbPromise: Promise<IDBPDatabase>;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_POLICIES)) {
          db.createObjectStore(STORE_POLICIES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_LEADS)) {
          db.createObjectStore(STORE_LEADS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_RECYCLE_LEADS)) {
          db.createObjectStore(STORE_RECYCLE_LEADS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_RECYCLE_POLICIES)) {
          db.createObjectStore(STORE_RECYCLE_POLICIES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_PREMIUM_USERS)) {
          db.createObjectStore(STORE_PREMIUM_USERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_PREMIUM_REQUESTS)) {
          db.createObjectStore(STORE_PREMIUM_REQUESTS, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const storage = {
  // Policy Methods
  async savePolicy(policy: any) {
    const db = await getDB();
    await db.put(STORE_POLICIES, policy);
  },
  async getPolicies() {
    const db = await getDB();
    return db.getAll(STORE_POLICIES);
  },
  async deletePolicy(id: string) {
    const db = await getDB();
    await db.delete(STORE_POLICIES, id);
  },
  // Lead Methods
  async saveLead(lead: any) {
    const db = await getDB();
    await db.put(STORE_LEADS, lead);
  },
  async getLeads() {
    const db = await getDB();
    return db.getAll(STORE_LEADS);
  },
  async deleteLead(id: string) {
    const db = await getDB();
    await db.delete(STORE_LEADS, id);
  },
  // Recycle Bin Methods
  async moveToRecycle(lead: any) {
    const db = await getDB();
    const tx = db.transaction([STORE_LEADS, STORE_RECYCLE_LEADS], 'readwrite');
    await tx.objectStore(STORE_LEADS).delete(lead.id);
    await tx.objectStore(STORE_RECYCLE_LEADS).put(lead);
    await tx.done;
  },
  async getRecycledLeads() {
    const db = await getDB();
    return db.getAll(STORE_RECYCLE_LEADS);
  },
  async restoreFromRecycle(lead: any) {
    const db = await getDB();
    const tx = db.transaction([STORE_LEADS, STORE_RECYCLE_LEADS], 'readwrite');
    await tx.objectStore(STORE_RECYCLE_LEADS).delete(lead.id);
    await tx.objectStore(STORE_LEADS).put(lead);
    await tx.done;
  },
  async permanentDeleteLead(id: string) {
    const db = await getDB();
    await db.delete(STORE_RECYCLE_LEADS, id);
  },
  // Policy Recycle
  async moveToRecyclePolicy(policy: any) {
    const db = await getDB();
    const tx = db.transaction([STORE_POLICIES, STORE_RECYCLE_POLICIES], 'readwrite');
    await tx.objectStore(STORE_POLICIES).delete(policy.id);
    await tx.objectStore(STORE_RECYCLE_POLICIES).put(policy);
    await tx.done;
  },
  async getRecycledPolicies() {
    const db = await getDB();
    return db.getAll(STORE_RECYCLE_POLICIES);
  },
  async restoreFromRecyclePolicy(policy: any) {
    const db = await getDB();
    const tx = db.transaction([STORE_POLICIES, STORE_RECYCLE_POLICIES], 'readwrite');
    await tx.objectStore(STORE_RECYCLE_POLICIES).delete(policy.id);
    await tx.objectStore(STORE_POLICIES).put(policy);
    await tx.done;
  },
  async permanentDeletePolicy(id: string) {
    const db = await getDB();
    await db.delete(STORE_RECYCLE_POLICIES, id);
  },
  // Premium User Management
  async addPremiumUser(user: PremiumUser) {
    const db = await getDB();
    await db.put(STORE_PREMIUM_USERS, user);
  },
  async getPremiumUsers() {
    const db = await getDB();
    return db.getAll(STORE_PREMIUM_USERS);
  },
  async deletePremiumUser(id: string) {
    const db = await getDB();
    await db.delete(STORE_PREMIUM_USERS, id);
  },
  async validatePremiumUser(username: string, password: string): Promise<boolean> {
    const users = await this.getPremiumUsers();
    return users.some(u => u.username === username && u.password === password);
  },
  // Premium Request Management
  async savePremiumRequest(request: PremiumRequest) {
    const db = await getDB();
    await db.put(STORE_PREMIUM_REQUESTS, request);
  },
  async getPremiumRequests() {
    const db = await getDB();
    return db.getAll(STORE_PREMIUM_REQUESTS);
  },
  async deletePremiumRequest(id: string) {
    const db = await getDB();
    await db.delete(STORE_PREMIUM_REQUESTS, id);
  },
  // Maintenance
  async clearAll() {
    const db = await getDB();
    const stores = [STORE_POLICIES, STORE_LEADS, STORE_RECYCLE_LEADS, STORE_RECYCLE_POLICIES, STORE_PREMIUM_USERS, STORE_PREMIUM_REQUESTS];
    for (const s of stores) await db.clear(s);
  },
  async exportBackup() {
    const policies = await this.getPolicies();
    const leads = await this.getLeads();
    const recycledLeads = await this.getRecycledLeads();
    const recycledPolicies = await this.getRecycledPolicies();
    const premiumUsers = await this.getPremiumUsers();
    const premiumRequests = await this.getPremiumRequests();
    return JSON.stringify({ 
      policies, 
      leads, 
      recycledLeads, 
      recycledPolicies, 
      premiumUsers,
      premiumRequests,
      version: DB_VERSION, 
      timestamp: new Date().toISOString() 
    });
  },
  async importBackup(jsonString: string) {
    const data = JSON.parse(jsonString);
    const db = await getDB();
    const tx = db.transaction([STORE_POLICIES, STORE_LEADS, STORE_RECYCLE_LEADS, STORE_RECYCLE_POLICIES, STORE_PREMIUM_USERS, STORE_PREMIUM_REQUESTS], 'readwrite');
    for (const p of (data.policies || [])) await tx.objectStore(STORE_POLICIES).put(p);
    for (const l of (data.leads || [])) await tx.objectStore(STORE_LEADS).put(l);
    for (const r of (data.recycledLeads || [])) await tx.objectStore(STORE_RECYCLE_LEADS).put(r);
    for (const rp of (data.recycledPolicies || [])) await tx.objectStore(STORE_RECYCLE_POLICIES).put(rp);
    for (const u of (data.premiumUsers || [])) await tx.objectStore(STORE_PREMIUM_USERS).put(u);
    for (const pr of (data.premiumRequests || [])) await tx.objectStore(STORE_PREMIUM_REQUESTS).put(pr);
    await tx.done;
  }
};
