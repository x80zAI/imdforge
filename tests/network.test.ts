import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNetworkHandler, createSnapshotReader } from '../api/network.mjs';

const IMD = '0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7';
const VAULT = '0x9efa934d9fad4ae28c998a40195646b965a97247';
const SCALE = 10n ** 18n;
const word = (value: bigint) => `0x${value.toString(16).padStart(64, '0')}`;
type RpcRequest = { id: number; method: string; params: unknown[] };
type RpcResponse = { jsonrpc: string; id: number; result?: string; error?: object };

function validResults(requests: RpcRequest[]): RpcResponse[] {
  return requests.map(({ id, method, params }) => {
    let result: string;
    if (method === 'eth_chainId') result = '0x1';
    else if (method === 'eth_blockNumber') result = '0x18e6973';
    else if (method === 'eth_getCode') result = '0x60806040';
    else {
      const { data } = params[0] as { data: string };
      if (data === '0x38d52e0f') result = `0x${IMD.slice(2).toLowerCase().padStart(64, '0')}`;
      else if (data === '0x313ce567') result = word(18n);
      else if (data === '0x18160ddd') result = word(3_975_791n * SCALE + 964447000000000000n);
      else result = word(1_750_064n * SCALE + 861035772800000001n);
    }
    return { jsonrpc: '2.0', id, result };
  });
}

function mockRpc(transform?: (rows: RpcResponse[], requests: RpcRequest[]) => unknown) {
  return vi.fn(async (_url: string | URL | Request, options?: RequestInit) => {
    const requests = JSON.parse(options?.body as string) as RpcRequest[];
    const results = validResults(requests);
    return new Response(JSON.stringify(transform ? transform(results, requests) : results));
  });
}

function mockResponse() {
  const headers: Record<string, string> = {};
  return {
    statusCode: 0,
    body: '',
    headers,
    setHeader(name: string, value: string) { headers[name] = value; },
    end(value: string) { this.body = value; },
  };
}

afterEach(() => vi.useRealTimers());

describe('Ethereum snapshot', () => {
  it('uses one pinned block and preserves exact IMD decimal strings', async () => {
    const fetchImpl = mockRpc();
    const read = createSnapshotReader({ fetchImpl, now: () => 1_800_000_000_000 });
    const snapshot = await read();
    expect(snapshot).toEqual({
      status: 'live', block: 26110323,
      totalSupply: '3975791.964447', vaultAssets: '1750064.861035772800000001',
      updatedAt: '2027-01-15T08:00:00.000Z', source: 'Ethereum public RPC',
    });
    const reads = JSON.parse(fetchImpl.mock.calls[1][1]?.body as string) as RpcRequest[];
    for (const request of reads) expect(request.params[1]).toBe('0x18e6973');
    expect(reads.filter(({ method }) => method === 'eth_getCode').map(({ params }) => params[0]))
      .toEqual([IMD, VAULT]);
  });

  it('caches successful reads for 45 seconds and shares simultaneous work', async () => {
    let time = 1_800_000_000_000;
    const fetchImpl = mockRpc();
    const read = createSnapshotReader({ fetchImpl, now: () => time });
    const [first, second] = await Promise.all([read(), read()]);
    expect(second).toBe(first);
    time += 44_999;
    expect(await read()).toBe(first);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    time += 1;
    expect(await read()).not.toBe(first);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('uses the fallback after a primary error and caches only that valid result', async () => {
    const success = mockRpc();
    const fetchImpl = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      if (url === 'https://ethereum.publicnode.com') throw new Error('Primary unavailable');
      return success(url, options);
    });
    const read = createSnapshotReader({ fetchImpl });
    expect((await read()).status).toBe('live');
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      'https://ethereum.publicnode.com', 'https://cloudflare-eth.com', 'https://cloudflare-eth.com',
    ]);
  });

  it('rejects the wrong chain before asking for contract values', async () => {
    const fetchImpl = mockRpc((rows, requests) => requests[0].method === 'eth_chainId'
      ? rows.map((row) => row.id === 1 ? { ...row, result: '0x2105' } : row) : rows);
    await expect(createSnapshotReader({ fetchImpl })()).rejects.toThrow('temporarily unavailable');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['missing IMD code', 1, '0x'],
    ['missing vault code', 2, '0x'],
    ['odd-length code', 1, '0x123'],
    ['wrong vault asset', 3, word(1n)],
    ['wrong token decimals', 4, word(6n)],
    ['short total supply', 5, '0x1'],
    ['invalid total assets', 6, '0x' + 'g'.repeat(64)],
  ])('rejects %s instead of reporting invented zero balances', async (_label, id, result) => {
    const fetchImpl = mockRpc((rows, requests) => requests[0].method === 'eth_getCode'
      ? rows.map((row) => row.id === id ? { ...row, result } : row) : rows);
    const read = createSnapshotReader({ fetchImpl });
    await expect(read()).rejects.toThrow('temporarily unavailable');
    await expect(read()).rejects.toThrow('temporarily unavailable');
    expect(fetchImpl).toHaveBeenCalledTimes(8);
  });

  it.each(['duplicate id', 'unknown id', 'missing response', 'RPC error', 'non-array', 'bad version'])('rejects malformed batch: %s', async (kind) => {
    const fetchImpl = mockRpc((rows) => {
      if (kind === 'duplicate id') return rows.map((row) => ({ ...row, id: 1 }));
      if (kind === 'unknown id') return rows.map((row) => ({ ...row, id: row.id + 100 }));
      if (kind === 'missing response') return rows.slice(1);
      if (kind === 'RPC error') return rows.map((row) => ({ ...row, error: { code: -32000 } }));
      if (kind === 'non-array') return rows[0];
      return rows.map((row) => ({ ...row, jsonrpc: '1.0' }));
    });
    await expect(createSnapshotReader({ fetchImpl })()).rejects.toThrow('temporarily unavailable');
  });

  it('accepts a genuine zero vault balance returned by the verified contract', async () => {
    const fetchImpl = mockRpc((rows, requests) => requests[0].method === 'eth_getCode'
      ? rows.map((row) => row.id === 6 ? { ...row, result: word(0n) } : row) : rows);
    expect((await createSnapshotReader({ fetchImpl })()).vaultAssets).toBe('0');
  });

  it('times out even if a provider ignores abort and still attempts fallback', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const fetchImpl = vi.fn((_url: string | URL | Request, options?: RequestInit) => {
      signals.push(options?.signal as AbortSignal);
      return new Promise<Response>(() => {});
    });
    const read = createSnapshotReader({ fetchImpl, timeoutMs: 100, primaryTimeoutMs: 40 });
    const result = expect(read()).rejects.toThrow('temporarily unavailable');
    await vi.advanceTimersByTimeAsync(101);
    await result;
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps caches separate between readers', async () => {
    const firstFetch = mockRpc();
    const secondFetch = mockRpc();
    await createSnapshotReader({ fetchImpl: firstFetch })();
    await createSnapshotReader({ fetchImpl: secondFetch })();
    expect(firstFetch).toHaveBeenCalledTimes(2);
    expect(secondFetch).toHaveBeenCalledTimes(2);
  });
});

describe('same-origin network handler', () => {
  it('rejects non-GET requests without contacting Ethereum', async () => {
    const read = vi.fn();
    const res = mockResponse();
    await createNetworkHandler(read)({ method: 'POST' }, res);
    expect(read).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET');
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('returns a live snapshot with cache headers and no cross-origin permission', async () => {
    const snapshot = await createSnapshotReader({ fetchImpl: mockRpc() })();
    const read = vi.fn(async () => snapshot);
    const res = mockResponse();
    await createNetworkHandler(read)({ method: 'GET', query: { method: 'eth_sendTransaction' } }, res);
    expect(read).toHaveBeenCalledWith();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(snapshot);
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=45, stale-while-revalidate=60');
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('reports an unavailable response with no fake balance and no cached error', async () => {
    const res = mockResponse();
    await createNetworkHandler(async () => { throw new Error('private provider details'); })({ method: 'GET' }, res);
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body)).toEqual({
      status: 'unavailable', message: 'Ethereum data is temporarily unavailable. Please try again.',
    });
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.body).not.toContain('private provider details');
    expect(res.body).not.toContain('vaultAssets');
  });
});
