const IMD_ADDRESS = '0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7';
const VAULT_ADDRESS = '0x9efa934d9fad4ae28c998a40195646b965a97247';
const RPC_ENDPOINTS = [
  'https://ethereum.publicnode.com',
  'https://cloudflare-eth.com',
];
const UNAVAILABLE_MESSAGE = 'Ethereum data is temporarily unavailable. Please try again.';
const CACHE_TTL_MS = 45_000;
const TOTAL_TIMEOUT_MS = 10_000;
const PRIMARY_TIMEOUT_MS = 4_800;

function validateBatch(payload, requests) {
  if (!Array.isArray(payload) || payload.length !== requests.length) {
    throw new Error('Invalid RPC batch.');
  }
  const expectedIds = new Set(requests.map(({ id }) => id));
  const results = new Map();
  for (const entry of payload) {
    if (
      !entry || entry.jsonrpc !== '2.0' || !expectedIds.has(entry.id)
      || results.has(entry.id) || entry.error !== undefined
      || typeof entry.result !== 'string'
    ) {
      throw new Error('Invalid RPC response.');
    }
    results.set(entry.id, entry.result);
  }
  return results;
}

function quantity(value) {
  if (!/^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(value)) {
    throw new Error('Invalid RPC quantity.');
  }
  return BigInt(value);
}

function word(value) {
  if (!/^0x[0-9a-f]{64}$/i.test(value)) {
    throw new Error('Invalid contract result.');
  }
  return BigInt(value);
}

function requireCode(value) {
  if (!/^0x(?:[0-9a-f]{2})+$/i.test(value)) {
    throw new Error('Missing contract code.');
  }
}

function formatImd(value) {
  const scale = 10n ** 18n;
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(18, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

async function batch(fetchImpl, endpoint, requests, signal) {
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requests),
    signal,
  });
  if (!response.ok) throw new Error('RPC HTTP error.');
  return validateBatch(await response.json(), requests);
}

function rpc(id, method, params) {
  return { jsonrpc: '2.0', id, method, params };
}

async function readEndpoint(fetchImpl, endpoint, signal, now) {
  const chain = await batch(fetchImpl, endpoint, [
    rpc(1, 'eth_chainId', []),
    rpc(2, 'eth_blockNumber', []),
  ], signal);
  if (quantity(chain.get(1)) !== 1n) throw new Error('Unexpected chain.');
  const blockValue = quantity(chain.get(2));
  if (blockValue > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Invalid block.');
  const blockTag = chain.get(2);
  const call = (address, data) => [{ to: address, data }, blockTag];
  const reads = await batch(fetchImpl, endpoint, [
    rpc(1, 'eth_getCode', [IMD_ADDRESS, blockTag]),
    rpc(2, 'eth_getCode', [VAULT_ADDRESS, blockTag]),
    rpc(3, 'eth_call', call(VAULT_ADDRESS, '0x38d52e0f')),
    rpc(4, 'eth_call', call(IMD_ADDRESS, '0x313ce567')),
    rpc(5, 'eth_call', call(IMD_ADDRESS, '0x18160ddd')),
    rpc(6, 'eth_call', call(VAULT_ADDRESS, '0x01e1d114')),
  ], signal);
  requireCode(reads.get(1));
  requireCode(reads.get(2));
  const asset = reads.get(3);
  if (!/^0x0{24}[0-9a-f]{40}$/i.test(asset)
    || `0x${asset.slice(-40)}`.toLowerCase() !== IMD_ADDRESS.toLowerCase()) {
    throw new Error('Unexpected vault asset.');
  }
  if (word(reads.get(4)) !== 18n) throw new Error('Unexpected IMD decimals.');
  return Object.freeze({
    status: 'live',
    block: Number(blockValue),
    totalSupply: formatImd(word(reads.get(5))),
    vaultAssets: formatImd(word(reads.get(6))),
    updatedAt: new Date(now()).toISOString(),
    source: 'Ethereum public RPC',
  });
}

async function withTimeout(operation, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('RPC timeout.'));
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/** Each reader has its own successful cache and request in flight. */
export function createSnapshotReader({
  fetchImpl = globalThis.fetch,
  now = Date.now,
  timeoutMs = TOTAL_TIMEOUT_MS,
  primaryTimeoutMs = PRIMARY_TIMEOUT_MS,
} = {}) {
  let cachedSnapshot = null;
  let cachedAt = 0;
  let inFlight = null;

  return function getSnapshotForReader() {
    const age = now() - cachedAt;
    if (cachedSnapshot && age >= 0 && age < CACHE_TTL_MS) {
      return Promise.resolve(cachedSnapshot);
    }
    if (inFlight) return inFlight;

    inFlight = withTimeout(async (overallSignal) => {
      const started = performance.now();
      for (let index = 0; index < RPC_ENDPOINTS.length; index += 1) {
        if (overallSignal.aborted) break;
        const remaining = timeoutMs - (performance.now() - started);
        if (remaining <= 0) break;
        const providerBudget = index === 0
          ? Math.min(primaryTimeoutMs, remaining)
          : remaining;
        try {
          const snapshot = await withTimeout(
            (signal) => readEndpoint(fetchImpl, RPC_ENDPOINTS[index], signal, now),
            providerBudget,
          );
          if (overallSignal.aborted) break;
          cachedSnapshot = snapshot;
          cachedAt = now();
          return snapshot;
        } catch {
          // Only a fully validated response may be cached or shown as live.
        }
      }
      throw new Error(UNAVAILABLE_MESSAGE);
    }, timeoutMs).catch(() => {
      throw new Error(UNAVAILABLE_MESSAGE);
    }).finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}

export const getSnapshot = createSnapshotReader();

export function createNetworkHandler(readSnapshot = getSnapshot) {
  return async function networkHandler(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.setHeader('Cache-Control', 'no-store');
      res.statusCode = 405;
      res.end(JSON.stringify({ status: 'unavailable', message: 'Only GET is supported.' }));
      return;
    }
    try {
      const snapshot = await readSnapshot();
      res.setHeader('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=60');
      res.statusCode = 200;
      res.end(JSON.stringify(snapshot));
    } catch {
      res.setHeader('Cache-Control', 'no-store');
      res.statusCode = 503;
      res.end(JSON.stringify({ status: 'unavailable', message: UNAVAILABLE_MESSAGE }));
    }
  };
}

export default createNetworkHandler();
