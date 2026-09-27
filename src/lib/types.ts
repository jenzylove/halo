import type { ReasoningRecord } from "./serv";

export type Category = "ticket" | "digital_good" | "data" | "subscription" | "other";

export interface Constraint {
  name: string; // e.g. "date", "venue", "format", "size"
  value: string; // e.g. "2026-10-12"
}

/** What the user asked for, in structured form. Hashed and locked onchain before the agent acts. */
export interface MandateTerms {
  summary: string; // plain words, shown back to the user for confirmation
  item: string;
  category: Category;
  quantity: number;
  maxUnitPrice: number | null; // USDC
  maxTotal: number; // USDC
  merchantRule: "verified_only" | "any";
  validHours: number;
  constraints: Constraint[];
}

export interface MerchantInfo {
  slug: string;
  name: string;
  origin: string; // where the merchant lives, e.g. https://halo.app/m/tickets
  payTo: `0x${string}`;
}

/** A concrete purchase the agent wants to make. Built from the merchant catalog and the x402 payment requirements. */
export interface Offer {
  merchant: MerchantInfo;
  item: { title: string; description: string; attributes: Record<string, string> };
  quantity: number;
  unitPrice: number;
  total: number;
  currency: "USDC";
  network: string;
  resource: string;
}

export type Decision = "approve" | "decline" | "ask_user";

export interface Reason {
  code: string;
  text: string;
}

export interface CheckResult {
  decision: Decision;
  reasons: Reason[];
  records: ReasoningRecord[];
}

export type ClaimType = "not_delivered" | "not_as_mandated" | "overcharged" | "merchant_fraud" | "no_issue";

export interface Verdict {
  covered: boolean;
  type: ClaimType;
  payout: number; // USDC, before contract caps
  merchantFault: boolean;
  reason: string;
  records: ReasoningRecord[];
}
