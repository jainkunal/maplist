import DodoPayments from 'dodopayments';

const globalForDodo = globalThis as unknown as { _dodo?: DodoPayments };

export function getDodo(): DodoPayments {
  if (globalForDodo._dodo) return globalForDodo._dodo;
  const client = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY,
    environment: process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode',
  });
  if (process.env.NODE_ENV !== 'production') globalForDodo._dodo = client;
  return client;
}
