
import { openDB, IDBPDatabase } from 'https://esm.sh/idb';

const DB_NAME = 'TheInsuranceBossDB';
const DB_VERSION = 1;
const STORE_POLICIES = 'policies';
const STORE_LEADS = 'leads';

let dbPromise: Promise<IDBPDatabase>;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
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
  return dbPromise;
};

export const storage = {
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
  async clearAll() {
    const db = await getDB();
    await db.clear(STORE_POLICIES);
    await db.clear(STORE_LEADS);
  },
  async exportBackup() {
    const policies = await this.getPolicies();
    const leads = await this.getLeads();
    return JSON.stringify({ policies, leads, version: DB_VERSION, timestamp: new Date().toISOString() });
  },
  async importBackup(jsonString: string) {
    const data = JSON.parse(jsonString);
    const db = await getDB();
    const tx = db.transaction([STORE_POLICIES, STORE_LEADS], 'readwrite');
    for (const p of (data.policies || [])) await tx.objectStore(STORE_POLICIES).put(p);
    for (const l of (data.leads || [])) await tx.objectStore(STORE_LEADS).put(l);
    await tx.done;
  }
};
