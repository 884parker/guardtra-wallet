# Base44 → Supabase Migration Guide

## Entity Mapping

| Base44 Entity | Supabase Table | Notes |
|---|---|---|
| `AppConfig` | `app_config` | Key-value user settings (lock hours, network, safe address, PIN) |
| `WalletProfile` | `wallet_profiles` | Vault, Guard, Liquidity, Recovery wallet addresses |
| `Transaction` | `transactions` | All tx records (held, completed, revoked) |
| `RecoveryAddress` | `recovery_addresses` | User's safe recovery addresses |
| `AlertRule` | `alert_rules` | User-defined alert conditions |
| `AlertLog` | `alert_log` | Triggered alert history |
| `UserWallet` (Safe) | `user_wallets` | PIN-encrypted Safe wallet (private key + mnemonic) |
| `ReceivedFund` (Safe) | `received_funds` | Incoming revoked funds to Safe |
| `Disbursement` (Safe) | `disbursements` | Outgoing transfers from Safe |

## SDK Call Mapping

| Base44 | Supabase |
|---|---|
| `base44.auth.me()` | `supabase.auth.getUser()` |
| `base44.auth.logout()` | `supabase.auth.signOut()` |
| `base44.auth.redirectToLogin()` | Custom login page with `supabase.auth.signInWithPassword()` or `signInWithOAuth()` |
| `base44.entities.X.list()` | `supabase.from('x').select('*').order('created_at', { ascending: false })` |
| `base44.entities.X.filter({ key: val })` | `supabase.from('x').select('*').eq('key', val)` |
| `base44.entities.X.create({...})` | `supabase.from('x').insert({...}).select().single()` |
| `base44.entities.X.update(id, {...})` | `supabase.from('x').update({...}).eq('id', id)` |
| `base44.entities.X.delete(id)` | `supabase.from('x').delete().eq('id', id)` |
| `base44.entities.X.subscribe()` | `supabase.channel('x').on('postgres_changes', ...)` |
| `base44.functions.invoke('fn', data)` | Supabase Edge Function: `supabase.functions.invoke('fn', { body: data })` |

## Backend Functions to Port

| Base44 Function | Purpose | Priority |
|---|---|---|
| `sendTransaction` | Send ETH from any wallet type | 🔴 Critical |
| `autoReleaseTransactions` | Scheduled: release held txns after lock expires | 🔴 Critical |
| `vaultRecovery` | Emergency 5-step recovery flow | 🔴 Critical |
| `getWalletBalance` | Fetch on-chain ETH/USDC balance | 🔴 Critical |
| `wallet` (Safe) | Create wallet, verify PIN, send, sync incoming | 🔴 Critical |
| `getWalletTransfers` | Fetch on-chain transfer history (Alchemy) | 🟡 Medium |
| `getSeedPhrase` | Decrypt and return seed phrase | 🟡 Medium |
| `setSecurityPin` / `verifyPin` | PIN management | 🟡 Medium |
| `monitorAlerts` | Check alert rules against txns | 🟢 Later |
| `monitorWalletActivity` | Background wallet monitoring | 🟢 Later |
| `generateWallets` / `generateSeeds` | Initial wallet generation | 🟢 Later |
| `getCrossChainBalances` | Multi-chain balance fetch | 🟢 Later |

## Environment Variables Needed in Supabase

| Key | Description |
|---|---|
| `ALCHEMY_API_KEY` | Alchemy API key (Sepolia) |
| `ALCHEMY_MAINNET_KEY` | Alchemy API key (Mainnet) |
| `VAULT_MNEMONIC` | Vault wallet seed phrase |
| `GUARD_MNEMONIC` | Guard wallet seed phrase |
| `LIQUIDITY_MNEMONIC` | Liquidity wallet seed phrase |
| `RECOVERY_MNEMONIC` | Recovery wallet seed phrase |

## Auth Setup

1. Enable Email/Password auth in Supabase dashboard
2. Enable Google OAuth (use Google Workspace credentials)
3. Set redirect URLs for pausewallet.com and pausesafe.com (or current domains)
4. Build custom login/signup pages (replaces Base44 generic login)

## Deployment

- **Frontend:** Vercel (both Pause Wallet + PauseSafe)
- **Backend:** Supabase Edge Functions (Deno, same as Base44 functions)
- **Database:** Supabase Postgres
- **Auth:** Supabase Auth + Google OAuth
