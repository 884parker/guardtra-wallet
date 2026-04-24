# Recovery Wallet Architecture — "The Vault"

## Overview
The Recovery wallet is a dormant, zero-balance wallet that serves as the **security control plane** for the entire Pause Wallet system. It never transacts, never holds funds — it exists solely to manage secrets and security settings across all wallet layers.

## Core Principles
1. **Zero balance, zero transactions** — nothing to steal
2. **Disguised identity** — user-chosen name & icon, no visible link to Pause Wallet
3. **Heavy authentication** — maximum inconvenience by design (only accessed in emergencies)
4. **Single point of control** — all sensitive operations route through here
5. **Encrypted secrets** — seeds/keys never displayed as plain text; export only as encrypted file

## What Recovery Controls
- PIN change for ALL wallets (Main, Liquidity, Recovery itself)
- Encrypted seed phrase export (per-wallet or all-at-once)
- Suspend / unsuspend any wallet
- View/change recovery email & phone
- Enable/disable MFA methods
- Emergency PIN bypass (pre-selected auth combo)

## Authentication Layers (on Recovery wallet access)

### Standard Access (PIN + 1 MFA)
- 6-digit PIN
- PLUS one of: email OTP, authenticator app (TOTP), biometric

### Sensitive Operations (PIN + 2 MFA)
For viewing seeds or changing PINs:
- 6-digit PIN
- PLUS email OTP
- PLUS authenticator app OR biometric

### Emergency PIN Bypass
If user forgets PIN, a pre-configured alternative auth combo:
- Email OTP + Authenticator TOTP + Security question(s)
- Configurable during setup (user picks which combo)
- Rate-limited: 3 attempts per 24 hours, then full lockout

### Nuclear Lockout Recovery
If ALL digital auth fails:
- Recovery phrase (12 words) — shown ONCE during setup, user writes it down
- This is the one analog fallback (the ironic seed phrase for the seedless system)
- Only unlocks Recovery wallet, which then allows resetting everything else

## Wallet Hierarchy

```
Recovery Wallet ("The Vault") — MASTER CONTROL
│
├── Main Wallet (Pause Wallet)
│   ├── Vault sub-wallet (cold storage, time-locked sends)
│   ├── Liquidity sub-wallet (active use)
│   └── PIN unlock only (standard)
│
└── Security Settings
    ├── All PINs
    ├── All seed phrases (encrypted)
    ├── MFA configuration
    ├── Suspend controls
    └── Emergency bypass config
```

## Disguise Feature
- During setup, user picks a custom name and icon for Recovery wallet
- Examples: "Notes", "Calculator Pro", "Fitness Log" — anything innocuous
- App icon on home screen matches the disguise
- Opening it shows a fake splash/loading screen before PIN prompt
- Optional: decoy screen on wrong PIN (shows fake content)

## Seed Phrase Handling
- Seed phrases are NEVER displayed as plain text in any UI
- Generated during wallet creation, immediately encrypted
- Stored in Supabase as encrypted blobs (encrypted client-side before upload)
- To access: Recovery wallet → Sensitive auth → Export as encrypted file
- Export file encrypted with a passphrase user enters at export time
- User can decrypt the file offline with a standard tool (or our decrypt utility)

## Database Schema Changes Needed

### `recovery_wallet` table (new)
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `display_name` (text) — user-chosen disguise name
- `display_icon` (text) — user-chosen icon identifier
- `mfa_email` (boolean, default true)
- `mfa_totp_secret` (text, encrypted) — authenticator app secret
- `mfa_biometric` (boolean, default false)
- `bypass_method` (jsonb) — configured emergency bypass combo
- `bypass_attempts` (int, default 0)
- `bypass_lockout_until` (timestamptz, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `encrypted_seeds` table (new)
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `wallet_type` (text) — 'main_vault', 'main_liquidity', 'recovery'
- `encrypted_seed` (text) — AES-256-GCM encrypted, client-side
- `iv` (text) — initialization vector
- `created_at` (timestamptz)

### Changes to `user_wallets`
- Remove any plain-text seed storage
- Add `suspended` (boolean, default false)
- Add `suspended_at` (timestamptz, nullable)
- Add `suspended_by` (text) — 'user' or 'system'

## Implementation Phases

### Phase 1 — PIN Reset via Supabase (today)
- Clear current PIN, set new one
- Verify unified PIN system works

### Phase 2 — Recovery Wallet Shell
- New Recovery wallet creation during setup
- Disguise name/icon picker
- Basic PIN-gated access
- PIN change for all wallets through Recovery

### Phase 3 — Seed Encryption
- Client-side encryption of seed phrases
- Encrypted storage in Supabase
- Export-only access (encrypted file download)
- Remove any plain-text seed display

### Phase 4 — MFA Stack
- Email OTP integration
- TOTP authenticator support
- Biometric (WebAuthn/passkeys)
- Emergency bypass configuration

### Phase 5 — Suspend & Advanced Features
- Suspend/unsuspend any wallet from Recovery
- Decoy screen on wrong PIN
- Activity log (who accessed what, when)
- Cross-device push notifications (Firebase)

## Security Considerations
- All encryption happens CLIENT-SIDE — Supabase never sees plain-text secrets
- Recovery wallet's own seed phrase is the "nuclear option" — exists offline only
- Rate limiting on all auth attempts (PIN, MFA, bypass)
- Session timeout: Recovery wallet auto-locks after 5 minutes of inactivity
- No "remember me" — always requires full auth on every access
