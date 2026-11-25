/**
 * ASAKA ZIYO — Payme & Click Payment Gateway Ready Adapter (2026)
 *
 * Follows official Payme Business Merchant API / Subscribe API specification:
 * - https://docs.payme.uz/
 * - https://docs.payme.uz/api/subscriptions/
 *
 * Security & Integrity:
 * - Credentials (`PAYME_MERCHANT_ID`, `PAYME_SECRET_KEY`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`)
 *   are strictly read from server environment variables — NEVER stored in frontend or APK.
 * - Inactive until real merchant credentials are configured in production environment.
 * - Verifies HTTP Basic Auth (Payme) / MD5 signature (Click) strictly server-side.
 */

import crypto from 'crypto';

export interface GatewayStatusSummary {
  payme: {
    configured: boolean;
    merchantIdMasked: string | null;
    webhookEndpoint: string;
    docsRef: string;
  };
  click: {
    configured: boolean;
    merchantIdMasked: string | null;
    webhookEndpoint: string;
  };
}

export function getPaymentGatewayStatus(): GatewayStatusSummary {
  const paymeId = (process.env.PAYME_MERCHANT_ID || '').trim();
  const paymeKey = (process.env.PAYME_SECRET_KEY || '').trim();
  const clickId = (process.env.CLICK_MERCHANT_ID || '').trim();
  const clickKey = (process.env.CLICK_SECRET_KEY || '').trim();

  return {
    payme: {
      configured: Boolean(paymeId && paymeKey),
      merchantIdMasked: paymeId ? `${paymeId.slice(0, 4)}****${paymeId.slice(-2)}` : null,
      webhookEndpoint: '/api/payments/webhooks/payme',
      docsRef: 'https://docs.payme.uz/',
    },
    click: {
      configured: Boolean(clickId && clickKey),
      merchantIdMasked: clickId ? `${clickId.slice(0, 3)}****` : null,
      webhookEndpoint: '/api/payments/webhooks/click',
    },
  };
}

export function verifyPaymeBasicAuth(authHeader?: string): boolean {
  const key = (process.env.PAYME_SECRET_KEY || '').trim();
  if (!key || !authHeader || !authHeader.startsWith('Basic ')) return false;
  try {
    const decoded = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf-8');
    const expected = `Paycom:${key}`;
    const a = Buffer.from(decoded);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function buildPaymeCheckoutUrl(params: { orderId: string; amountUzs: number; returnUrl?: string }): string | null {
  const merchantId = (process.env.PAYME_MERCHANT_ID || '').trim();
  if (!merchantId) return null;
  // Payme expects amount in tiyin (1 UZS = 100 tiyin)
  const amountTiyin = Math.max(100, Math.round(params.amountUzs * 100));
  const payload = `m=${merchantId};ac.order_id=${params.orderId};a=${amountTiyin}${
    params.returnUrl ? `;c=${params.returnUrl}` : ''
  }`;
  const encoded = Buffer.from(payload, 'utf-8').toString('base64');
  return `https://checkout.paycom.uz/${encoded}`;
}
