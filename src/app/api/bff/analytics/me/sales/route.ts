import { NextRequest } from 'next/server';
import { forwardGatewayGet } from '@/lib/bff/analyticsGateway';

// GET /api/bff/analytics/me/sales → the caller's OWN sales (C-105 §6 slice 2).
// Sales truth is owned by tec-commerce-service (Order owner), so we PRESENT it —
// we never re-derive it in analytics. The seller is the verified session identity
// server-side (commerce reads it from the token), never a query/body param.
// Fail closed (401) w/o session.
export async function GET(req: NextRequest) {
  return forwardGatewayGet(req, '/api/commerce/orders/seller/sales-summary');
}
