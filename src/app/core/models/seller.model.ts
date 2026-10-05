/** Everything stored on the device for one seller. Never business/customer data. */
export interface SellerProfile {
  /** Normalized (trimmed, lower-case) — used as the lookup key. */
  sellerId: string;
  /** As the seller typed it, for display. */
  displayName?: string;
  pinHash: string;
  salt: string;
  scriptUrl: string;
  createdAt: number;
}

export interface Session {
  sellerId: string;
  expiresAt: number;
}
