'use client';

import { useCallback, useEffect, useState } from 'react';

// ── Response shapes (mirror tec-analytics-service AnalyticsService) ──────────

export interface DailyMetric {
  date:            string;
  total_payments?: number;
  total_volume?:   number;
  new_users?:      number;
  active_users?:   number;
  kyc_submitted?:  number;
  kyc_verified?:   number;
}

export interface Overview {
  totalEvents:   number;
  totalPayments: number;
  totalUsers:    number;
  recentMetrics: DailyMetric[];
}

export interface PaymentAnalytics {
  metrics:     DailyMetric[];
  totalVolume: number;
  totalCount:  number;
}

export interface UserAnalytics {
  metrics: DailyMetric[];
}

export interface AnalyticsEvent {
  id:         string;
  type:       string;
  payload:    Record<string, unknown>;
  user_id?:   string | null;
  created_at: string;
}

export interface AsyncState<T> {
  data:    T | null;
  loading: boolean;
  error:   string | null;
  reload:  () => void;
}

// The service wraps payloads as { success, data }. Unwrap defensively.
function unwrap<T>(json: unknown): T {
  const obj = json as { data?: T } | null;
  return (obj && typeof obj === 'object' && 'data' in obj ? (obj.data as T) : (json as T));
}

/** Fetch one BFF analytics resource with loading/error state (C-96: surfaced, never silent). */
export function useAnalyticsResource<T>(path: string): AsyncState<T> {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(path, { credentials: 'include', cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = (json as { error?: string })?.error ?? `Request failed (${res.status})`;
          throw new Error(msg);
        }
        if (!cancelled) setData(unwrap<T>(json));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [path]);

  useEffect(() => load(), [load]);

  return { data, loading, error, reload: load };
}

export const useOverview        = () => useAnalyticsResource<Overview>('/api/bff/analytics/overview');
export const usePaymentAnalytics = () => useAnalyticsResource<PaymentAnalytics>('/api/bff/analytics/payments');
export const useUserAnalytics   = () => useAnalyticsResource<UserAnalytics>('/api/bff/analytics/users');
export const useRecentEvents    = (limit = 20) =>
  useAnalyticsResource<AnalyticsEvent[]>(`/api/bff/analytics/events?limit=${limit}`);
