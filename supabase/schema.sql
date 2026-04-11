-- ============================================================
-- GUARDTRA WALLET — Supabase Database Schema
-- Replaces Base44 entities
-- Run this in Supabase SQL Editor after creating your project
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase Auth users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- WALLET_PROFILES (Vault, Guard, Liquidity, Recovery)
-- ============================================================
create table public.wallet_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  wallet_type text not null check (wallet_type in ('vault', 'guard', 'liquidity', 'recovery')),
  address text,
  balance_eth numeric default 0,
  balance_btc numeric default 0,
  balance_usdc numeric default 0,
  is_compromised boolean default false,
  is_system_managed boolean default true,
  label text,
  network text default 'sepolia',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, wallet_type)
);

-- ============================================================
-- TRANSACTIONS (held, completed, revoked, etc.)
-- ============================================================
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  asset text not null default 'ETH' check (asset in ('ETH', 'BTC', 'USDC', 'MATIC')),
  from_wallet text check (from_wallet in ('vault', 'guard', 'liquidity')),
  to_address text,
  network text,
  status text not null default 'pending' check (status in ('pending', 'held', 'completed', 'revoked', 'emergency_frozen')),
  release_at timestamptz,
  is_user_initiated boolean default true,
  destination_label text,
  usd_value numeric,
  tx_hash text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_transactions_user_status on public.transactions(user_id, status);
create index idx_transactions_release on public.transactions(status, release_at) where status = 'held';

-- ============================================================
-- APP_CONFIG (user settings: lock hours, network, safe address, PIN)
-- ============================================================
create table public.app_config (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  key text not null,
  value text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, key)
);

-- ============================================================
-- RECOVERY_ADDRESSES (where revoked funds go)
-- ============================================================
create table public.recovery_addresses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  address text not null,
  label text default 'Recovery Address',
  is_primary boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- ALERT_RULES (user-defined alert conditions)
-- ============================================================
create table public.alert_rules (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  condition_type text, -- 'amount_threshold', 'unknown_address', etc.
  threshold numeric,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- ALERT_LOG (triggered alert history)
-- ============================================================
create table public.alert_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rule_id uuid references public.alert_rules(id) on delete set null,
  message text,
  severity text default 'info',
  created_at timestamptz default now()
);

-- ============================================================
-- GUARDTRASAFE: USER_WALLETS (PIN-encrypted wallets)
-- ============================================================
create table public.user_wallets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  owner_email text not null,
  address text not null,
  encrypted_private_key text not null,
  encrypted_mnemonic text not null,
  pin_hash text not null,
  network text default 'sepolia',
  created_at timestamptz default now(),
  unique(user_id)
);

-- ============================================================
-- GUARDTRASAFE: RECEIVED_FUNDS (incoming revoked txns)
-- ============================================================
create table public.received_funds (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  asset text default 'ETH',
  from_address text,
  received_at timestamptz,
  status text default 'holding' check (status in ('holding', 'sent')),
  tx_hash_in text,
  created_at timestamptz default now()
);

-- ============================================================
-- GUARDTRASAFE: DISBURSEMENTS (outgoing from Safe)
-- ============================================================
create table public.disbursements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  received_fund_id text,
  to_address text not null,
  amount numeric not null,
  asset text default 'ETH',
  tx_hash_out text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — users can only see their own data
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.wallet_profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.app_config enable row level security;
alter table public.recovery_addresses enable row level security;
alter table public.alert_rules enable row level security;
alter table public.alert_log enable row level security;
alter table public.user_wallets enable row level security;
alter table public.received_funds enable row level security;
alter table public.disbursements enable row level security;

-- Profiles: users see only their own
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Wallet profiles: users see only their own
create policy "Users can view own wallets" on public.wallet_profiles for select using (auth.uid() = user_id);
create policy "Users can insert own wallets" on public.wallet_profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own wallets" on public.wallet_profiles for update using (auth.uid() = user_id);
create policy "Users can delete own wallets" on public.wallet_profiles for delete using (auth.uid() = user_id);

-- Transactions
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);

-- App config
create policy "Users can view own config" on public.app_config for select using (auth.uid() = user_id);
create policy "Users can insert own config" on public.app_config for insert with check (auth.uid() = user_id);
create policy "Users can update own config" on public.app_config for update using (auth.uid() = user_id);

-- Recovery addresses
create policy "Users can view own recovery" on public.recovery_addresses for select using (auth.uid() = user_id);
create policy "Users can insert own recovery" on public.recovery_addresses for insert with check (auth.uid() = user_id);
create policy "Users can update own recovery" on public.recovery_addresses for update using (auth.uid() = user_id);
create policy "Users can delete own recovery" on public.recovery_addresses for delete using (auth.uid() = user_id);

-- Alert rules
create policy "Users can view own rules" on public.alert_rules for select using (auth.uid() = user_id);
create policy "Users can insert own rules" on public.alert_rules for insert with check (auth.uid() = user_id);
create policy "Users can update own rules" on public.alert_rules for update using (auth.uid() = user_id);
create policy "Users can delete own rules" on public.alert_rules for delete using (auth.uid() = user_id);

-- Alert log
create policy "Users can view own alerts" on public.alert_log for select using (auth.uid() = user_id);
create policy "Users can insert own alerts" on public.alert_log for insert with check (auth.uid() = user_id);

-- User wallets (Safe)
create policy "Users can view own safe wallet" on public.user_wallets for select using (auth.uid() = user_id);
create policy "Users can insert own safe wallet" on public.user_wallets for insert with check (auth.uid() = user_id);
create policy "Users can update own safe wallet" on public.user_wallets for update using (auth.uid() = user_id);

-- Received funds (Safe)
create policy "Users can view own received" on public.received_funds for select using (auth.uid() = user_id);
create policy "Users can insert own received" on public.received_funds for insert with check (auth.uid() = user_id);
create policy "Users can update own received" on public.received_funds for update using (auth.uid() = user_id);

-- Disbursements (Safe)
create policy "Users can view own disbursements" on public.disbursements for select using (auth.uid() = user_id);
create policy "Users can insert own disbursements" on public.disbursements for insert with check (auth.uid() = user_id);

-- ============================================================
-- SERVICE ROLE POLICIES (for Edge Functions / backend operations)
-- Edge Functions use the service_role key which bypasses RLS.
-- No additional policies needed for server-side operations.
-- ============================================================

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles for each row execute procedure public.update_updated_at();
create trigger set_updated_at before update on public.wallet_profiles for each row execute procedure public.update_updated_at();
create trigger set_updated_at before update on public.transactions for each row execute procedure public.update_updated_at();
create trigger set_updated_at before update on public.app_config for each row execute procedure public.update_updated_at();
