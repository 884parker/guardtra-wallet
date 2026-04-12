/**
 * Legacy compatibility shim — all calls route through Supabase.
 * TODO: Refactor components to import from '@/api/db' directly and delete this file.
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
    redirectToLogin: () => {},
  },
  functions: {
    invoke: async (name, body) => {
      const result = await functions.invoke(name, body);
      return result;
    },
  },
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
