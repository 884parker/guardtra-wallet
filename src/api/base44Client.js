/**
 * Base44 compatibility layer — routes all calls through Supabase.
 * 
 * This file replaces the original Base44 SDK client.
 * All existing code that imports { base44 } from '@/api/base44Client'
 * will now transparently use Supabase instead.
 */

import { entities, auth, functions } from './db';

export const base44 = {
  entities: {
    Transaction: entities.Transaction,
    WalletProfile: entities.WalletProfile,
    AppConfig: entities.AppConfig,
    RecoveryAddress: entities.RecoveryAddress,
    AlertRule: entities.AlertRule,
    AlertLog: entities.AlertLog,
    UserWallet: entities.UserWallet,
    ReceivedFund: entities.ReceivedFund,
    Disbursement: entities.Disbursement,
  },
  auth: {
    me: auth.me,
    logout: auth.signOut,
    redirectToLogin: () => {}, // Handled by AuthContext now
  },
  functions: {
    invoke: async (name, body) => {
      const result = await functions.invoke(name, body);
      return result;
    },
  },
  // Service role operations go through Edge Functions
  asServiceRole: {
    entities: {
      Transaction: entities.Transaction,
      WalletProfile: entities.WalletProfile,
      AppConfig: entities.AppConfig,
      RecoveryAddress: entities.RecoveryAddress,
      UserWallet: entities.UserWallet,
      ReceivedFund: entities.ReceivedFund,
      Disbursement: entities.Disbursement,
    },
  },
};
