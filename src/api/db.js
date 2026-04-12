/**
 * Database abstraction layer — Supabase CRUD + Edge Functions.
 * 
 * Usage:
 *   import { db } from '@/api/db';
 *   
 *   // List all with optional ordering
 *   const txs = await db.transactions.list('-created_at', 20);
 *   
 *   // Filter
 *   const held = await db.transactions.filter({ status: 'held' });
 *   
 *   // Create
 *   const tx = await db.transactions.create({ amount: 0.5, asset: 'ETH', ... });
 *   
 *   // Update
 *   await db.transactions.update(id, { status: 'revoked' });
 *   
 *   // Delete
 *   await db.transactions.delete(id);
 *   
 *   // Subscribe to real-time changes
 *   const unsub = db.transactions.subscribe(callback);
 */

import { supabase } from './supabaseClient';
import { mapFunctionName } from './functionMap';

// Get current user ID (cached per call)
async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// Build a table helper with CRUD + subscribe
function createTableHelper(tableName) {
  return {
    /**
     * List records, optionally ordered and limited.
     * @param {string} orderBy - Column name, prefix with '-' for descending
     * @param {number} limit - Max records to return
     */
    async list(orderBy = '-created_at', limit = 100) {
      const userId = await getUserId();
      const desc = orderBy.startsWith('-');
      const column = desc ? orderBy.slice(1) : orderBy;
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .order(column, { ascending: !desc })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },

    /**
     * Filter records by key-value pairs.
     * @param {object} filters - { column: value } pairs
     * @param {string} orderBy - Optional ordering
     * @param {number} limit - Optional limit
     */
    async filter(filters = {}, orderBy = '-created_at', limit = 100) {
      const userId = await getUserId();
      const desc = typeof orderBy === 'string' && orderBy.startsWith('-');
      const column = desc ? orderBy.slice(1) : (orderBy || 'created_at');

      let query = supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId);

      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }

      query = query.order(column, { ascending: !desc }).limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    /**
     * Create a record. Automatically injects user_id.
     */
    async create(record) {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from(tableName)
        .insert({ ...record, user_id: userId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    /**
     * Update a record by ID.
     */
    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    /**
     * Delete a record by ID.
     */
    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },

    /**
     * Subscribe to real-time changes on this table for the current user.
     * Returns an unsubscribe function.
     */
    subscribe(callback) {
      const channel = supabase
        .channel(`${tableName}_changes`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          (payload) => {
            const type = payload.eventType === 'INSERT' ? 'create'
              : payload.eventType === 'UPDATE' ? 'update'
              : payload.eventType === 'DELETE' ? 'delete'
              : payload.eventType;
            
            callback({
              type,
              data: payload.new || payload.old,
              id: (payload.new || payload.old)?.id,
            });
          }
        )
        .subscribe();

      // Return unsubscribe function
      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}

// Auth helper
export const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw error || new Error('Not authenticated');
    return { id: user.id, email: user.email, ...user.user_metadata };
  },

  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Functions helper — calls Supabase Edge Functions
export const functions = {
  async invoke(functionName, body = {}) {
    const mappedName = mapFunctionName(functionName);
    const { data, error } = await supabase.functions.invoke(mappedName, {
      body,
    });
    if (error) throw error;
    return { data };
  },
};

// Table helpers
export const db = {
  transactions: createTableHelper('transactions'),
  walletProfiles: createTableHelper('wallet_profiles'),
  appConfig: createTableHelper('app_config'),
  recoveryAddresses: createTableHelper('recovery_addresses'),
  alertRules: createTableHelper('alert_rules'),
  alertLog: createTableHelper('alert_log'),
  userWallets: createTableHelper('user_wallets'),
  receivedFunds: createTableHelper('received_funds'),
  disbursements: createTableHelper('disbursements'),
};

// Legacy compatibility — entity access pattern
export const entities = {
  Transaction: db.transactions,
  WalletProfile: db.walletProfiles,
  AppConfig: db.appConfig,
  RecoveryAddress: db.recoveryAddresses,
  AlertRule: db.alertRules,
  AlertLog: db.alertLog,
  UserWallet: db.userWallets,
  ReceivedFund: db.receivedFunds,
  Disbursement: db.disbursements,
};
