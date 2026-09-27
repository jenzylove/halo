import { neon } from "@neondatabase/serverless";
import type { ReasoningRecord } from "./serv";

// Postgres keeps the words (mandates, offers, reasons, reasoning records). The chain keeps the money.

let _sql: ReturnType<typeof neon> | null = null;
export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  _sql ??= neon(process.env.DATABASE_URL);
  return _sql;
}

let migrated = false;
export async function migrate() {
  if (migrated) return;
  const q = sql();
  await q`create table if not exists users (id text primary key, wallet text not null, created_at timestamptz default now())`;
  await q`alter table users add column if not exists ip text`;
  await q`create table if not exists owners (user_id text primary key, owner text not null, linked_at timestamptz default now())`;
  await q`create table if not exists api_keys (key text primary key, user_id text not null unique, created_at timestamptz default now())`;
  await q`create table if not exists mandates (
    id text primary key, user_id text not null, instruction text not null, terms jsonb not null, terms_hash text not null,
    max_total numeric not null, expires_at timestamptz not null, tx text, created_at timestamptz default now())`;
  await q`create table if not exists purchases (
    id text primary key, mandate_id text not null, user_id text not null, merchant_slug text not null, offer jsonb not null,
    decision text not null, reasons jsonb not null, amount numeric not null, fee numeric, status text not null,
    approval_tx text, fee_tx text, payment_tx text, delivery jsonb, delivery_hash text, link_tx text,
    created_at timestamptz default now())`;
  await q`create table if not exists claims (
    id text primary key, user_id text not null, filed_by text not null, evidence text, verdict jsonb, payout numeric,
    merchant_fault boolean, status text not null, file_tx text, resolve_tx text, created_at timestamptz default now())`;
  await q`create table if not exists records (
    id text primary key, hash text not null, kind text not null, subject text, data jsonb not null, created_at timestamptz default now())`;
  migrated = true;
}

export async function saveRecords(subject: string, records: ReasoningRecord[]) {
  await migrate();
  for (const r of records) {
    await sql()`insert into records (id, hash, kind, subject, data) values (${r.id}, ${r.hash}, ${r.kind}, ${subject}, ${JSON.stringify(r)})
      on conflict (id) do nothing`;
  }
}

export async function recordsFor(subject: string): Promise<ReasoningRecord[]> {
  await migrate();
  const rows = (await sql()`select data from records where subject = ${subject} order by created_at`) as { data: ReasoningRecord }[];
  return rows.map((r) => r.data);
}
