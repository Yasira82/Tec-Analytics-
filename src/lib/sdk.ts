import { TecSdk } from '@yasser172/tec-sdk';
import { getAccessToken, getStoredUser } from '@/lib-client/pi/pi-auth';

// NEW-A: NEVER hardcode internal Railway URLs in client code — they end up in
// the shipped bundle. This client-side sdk exists only for the incomplete-
// payment fallback path; the primary data path is the server-only BFF
// (/api/bff/* → API_GATEWAY_URL). If the public env is unset, calls through
// this sdk fail loudly instead of silently talking to a leaked internal URL.
const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? '';

export const sdk = new TecSdk({ gatewayUrl });

const getToken = (): string | null => getAccessToken();

const getUserId = (): string | null => {
  const user = getStoredUser() as { id?: string; uid?: string } | null;
  return user?.id ?? user?.uid ?? null;
};

export { getToken, getUserId };
export default sdk;
