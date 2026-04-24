# Pause Wallet

**Time-locked crypto security. Every transaction gets a cooling-off period.**

## What Is Pause Wallet?

Pause Wallet is a multi-layer cryptocurrency wallet where every outbound transaction from the Vault is held for a configurable time lock (default 24 hours) before release. During the hold period, you can revoke any transaction — whether you made a mistake or someone compromised your wallet.

## Architecture

- **Vault Wallet** — Primary cold storage. Sends are routed through Hold.
- **Hold Wallet** — Time-lock enforcement. Funds sit here during the cooling period.
- **Liquidity Wallet** — Instant-send for trusted, everyday transactions.
- **PauseSafe** — Recovery wallet. Revoked funds land here.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **Blockchain:** Ethereum (Sepolia testnet / Mainnet)
- **RPC:** Alchemy
- **Hosting:** Vercel

## Local Development

```bash
npm install
npm run dev
```

Requires `.env.local` with Supabase credentials.

## Edge Functions

- `auto-release` — Cron-triggered: releases held transactions after time lock expires
- `generate-wallets` — Creates Vault/Hold/Liquidity wallets on signup
- `send-transaction` — Signs and broadcasts ETH transactions
- `get-wallet-balance` — Fetches on-chain balance via Alchemy
- `get-wallet-transfers` — Fetches transaction history via Alchemy
- `vault-recovery` — Emergency fund recovery flow
- `wallet` — PauseSafe wallet operations
- `monitorAlerts` — Alert rule evaluation

## Patent Status

Provisional patent filed. Patent pending.

---

© 2026 Pause Wallet. All rights reserved.
