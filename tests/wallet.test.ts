import { describe, expect, it, vi } from 'vitest';
import { IMD_TOKEN_ADDRESS, READ_ONLY_METHODS, WalletSession, formatTokenBalance,
  parseChainId, parseWalletAccount, readOnlyRequest, type EthereumProvider } from '../src/lib/wallet';

const ACCOUNT_A = '0x12345678901234567890123456789012345678ab';
const ACCOUNT_B = '0x98765432109876543210987654321098765432cd';
const hexBalance = (amount: bigint) => `0x${amount.toString(16).padStart(64, '0')}`;

function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>((done) => { resolve = done; });
  return { promise, resolve };
}

function mockProvider(balance = hexBalance(123456789012345678901n)) {
  const listeners = new Map<string, Set<(value?: unknown) => void>>();
  const provider = {
    request: vi.fn(async ({ method }: { method: string; params?: unknown[] }): Promise<unknown> => {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [ACCOUNT_A];
      if (method === 'eth_chainId') return '0x1';
      if (method === 'eth_call') return balance;
      throw new Error('Unexpected request');
    }),
    on: vi.fn((event: string, listener: (value?: unknown) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)?.add(listener);
    }),
    removeListener: vi.fn((event: string, listener: (value?: unknown) => void) => {
      listeners.get(event)?.delete(listener);
    }),
    disconnect: vi.fn(),
    emit: (event: string, value?: unknown) => {
      listeners.get(event)?.forEach((listener) => listener(value));
    },
  };
  return provider;
}

async function flushEvents() {
  for (let step = 0; step < 8; step++) await Promise.resolve();
}

describe('read-only wallet protocol', () => {
  it('permits only the four read-only connection and query methods', async () => {
    const provider = mockProvider();
    for (const method of READ_ONLY_METHODS) await readOnlyRequest(provider, method);
    for (const method of ['eth_sendTransaction', 'eth_sign', 'personal_sign', 'eth_signTypedData_v4',
      'wallet_switchEthereumChain', 'wallet_addEthereumChain', 'approve', '']) {
      expect(() => readOnlyRequest(provider, method)).toThrow('not available');
    }
    expect(provider.request).toHaveBeenCalledTimes(4);
  });

  it('validates every returned account and rejects malformed responses', () => {
    expect(parseWalletAccount([ACCOUNT_A, ACCOUNT_B])).toBe(ACCOUNT_A);
    expect(parseWalletAccount([])).toBeNull();
    for (const value of [ACCOUNT_A, null, undefined, {}, [123], ['0x12'], [ACCOUNT_A, 'bad'], ['0x' + 'g'.repeat(40)]]) {
      expect(() => parseWalletAccount(value)).toThrow('invalid account');
    }
  });

  it('validates network responses and normalizes hexadecimal IDs', () => {
    expect(parseChainId('0x01')).toBe('0x1');
    expect(parseChainId('0xAA')).toBe('0xaa');
    for (const value of [1, '1', '0x', '0xZZ', null, '0x' + '1'.repeat(65)]) {
      expect(() => parseChainId(value)).toThrow('wallet network');
    }
  });

  it('formats all 18 decimals exactly without rounding large values', () => {
    expect(formatTokenBalance(hexBalance(0n))).toBe('0');
    expect(formatTokenBalance(hexBalance(1n))).toBe('0.000000000000000001');
    expect(formatTokenBalance(hexBalance(1200000000000000000n))).toBe('1.2');
    expect(formatTokenBalance(hexBalance(123456789012345678901n))).toBe('123.456789012345678901');
    expect(formatTokenBalance(hexBalance(900719925474099312345678901234567890n)))
      .toBe('900719925474099312.34567890123456789');
    expect(formatTokenBalance(hexBalance((1n << 256n) - 1n)))
      .toBe('115792089237316195423570985008687907853269984665640564039457.584007913129639935');
  });

  it('rejects missing, truncated, negative, oversized and non-hex balances', () => {
    for (const value of [null, 42, '', '0x', '0x0', '-1', '0x' + 'f'.repeat(65), '0x' + 'g'.repeat(64)]) {
      expect(() => formatTokenBalance(value)).toThrow('valid IMD balance');
    }
  });
});

describe('wallet session', () => {
  it('reads only the verified token balance on Ethereum', async () => {
    const provider = mockProvider();
    const session = new WalletSession(() => provider);
    await session.connect();
    expect(session.getSnapshot()).toMatchObject({ address: ACCOUNT_A, balance: '123.456789012345678901',
      chainId: '0x1', status: 'connected' });
    expect(provider.request.mock.calls.map(([request]) => request.method))
      .toEqual(['eth_requestAccounts', 'eth_chainId', 'eth_call']);
    expect(provider.request).toHaveBeenLastCalledWith({ method: 'eth_call', params: [
      { to: IMD_TOKEN_ADDRESS, data: '0x70a08231' + ACCOUNT_A.slice(2).padStart(64, '0') }, 'latest',
    ] });
  });

  it('handles no installed wallet, user rejection and invalid account results', async () => {
    const missing = new WalletSession(() => undefined);
    await missing.connect();
    expect(missing.getSnapshot()).toMatchObject({ status: 'error', address: null });
    expect(missing.getSnapshot().message).toContain('No wallet was found');
    const provider = mockProvider();
    provider.request.mockRejectedValueOnce({ code: 4001 });
    const rejected = new WalletSession(() => provider);
    await rejected.connect();
    expect(rejected.getSnapshot().message).toContain('Connection cancelled');
    provider.request.mockResolvedValueOnce(['0xbad']);
    await rejected.connect();
    expect(rejected.getSnapshot().message).toContain('invalid account');
    expect(provider.request).toHaveBeenCalledTimes(2);
  });

  it('asks for a manual network change and never queries a token on another chain', async () => {
    const provider = mockProvider();
    provider.request.mockImplementation(async ({ method }) => method === 'eth_requestAccounts' ? [ACCOUNT_A] : '0x89');
    const session = new WalletSession(() => provider);
    await session.connect();
    expect(session.getSnapshot()).toMatchObject({ status: 'error', chainId: '0x89', balance: null });
    expect(session.getSnapshot().message).toContain('Switch your wallet to Ethereum Mainnet');
    expect(provider.request.mock.calls.map(([request]) => request.method)).toEqual(['eth_requestAccounts', 'eth_chainId']);
  });

  it('keeps malformed balance results out of the connected state', async () => {
    const provider = mockProvider('0x1');
    const session = new WalletSession(() => provider);
    await session.connect();
    expect(session.getSnapshot()).toMatchObject({ status: 'error', balance: null, address: null });
    expect(session.getSnapshot().message).toContain('valid IMD balance');
  });

  it('does not resurrect a locally disconnected session after a delayed balance', async () => {
    const pending = deferred();
    const provider = mockProvider();
    const original = provider.request.getMockImplementation()!;
    provider.request.mockImplementation((request) => request.method === 'eth_call' ? pending.promise : original(request));
    const session = new WalletSession(() => provider);
    const connecting = session.connect();
    await flushEvents();
    session.disconnect();
    pending.resolve(hexBalance(100n));
    await connecting;
    provider.emit('accountsChanged', [ACCOUNT_B]);
    provider.emit('chainChanged', '0x1');
    await flushEvents();
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', address: null, balance: null });
    expect(provider.disconnect).not.toHaveBeenCalled();
    expect(provider.request).toHaveBeenCalledTimes(3);
  });

  it('ignores a delayed account permission response after provider disconnect', async () => {
    const pending = deferred();
    const provider = mockProvider();
    provider.request.mockImplementationOnce(() => pending.promise);
    const session = new WalletSession(() => provider);
    const connecting = session.connect();
    provider.emit('disconnect');
    pending.resolve([ACCOUNT_A]);
    await connecting;
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', address: null, balance: null });
    expect(provider.request).toHaveBeenCalledTimes(1);
  });

  it('ignores an old account balance while refreshing the new account', async () => {
    const pending = deferred();
    const provider = mockProvider();
    const original = provider.request.getMockImplementation()!;
    provider.request.mockImplementation((request) => {
      const call = request.params?.[0] as { data?: string } | undefined;
      return request.method === 'eth_call' && call?.data?.endsWith(ACCOUNT_A.slice(2))
        ? pending.promise : original(request);
    });
    const session = new WalletSession(() => provider);
    const connecting = session.connect();
    await flushEvents();
    provider.emit('accountsChanged', [ACCOUNT_B]);
    await flushEvents();
    expect(session.getSnapshot()).toMatchObject({ status: 'connected', address: ACCOUNT_B });
    pending.resolve(hexBalance(999n));
    await connecting;
    expect(session.getSnapshot()).toMatchObject({ address: ACCOUNT_B, balance: '123.456789012345678901' });
  });

  it('clears stale balances immediately when the network changes', async () => {
    const pending = deferred();
    const provider = mockProvider();
    const original = provider.request.getMockImplementation()!;
    provider.request.mockImplementation((request) => request.method === 'eth_call' ? pending.promise : original(request));
    const session = new WalletSession(() => provider);
    const connecting = session.connect();
    await flushEvents();
    provider.emit('chainChanged', '0xa');
    pending.resolve(hexBalance(999n));
    await connecting;
    expect(session.getSnapshot()).toMatchObject({ status: 'error', chainId: '0xa', balance: null });
  });

  it('refreshes on returning to Ethereum, and clears an empty account selection', async () => {
    const provider = mockProvider();
    const session = new WalletSession(() => provider);
    await session.connect();
    provider.emit('chainChanged', '0x89');
    provider.emit('chainChanged', '0x1');
    await flushEvents();
    expect(session.getSnapshot()).toMatchObject({ status: 'connected', chainId: '0x1' });
    expect(provider.request.mock.calls.some(([request]) => request.method === 'eth_accounts')).toBe(true);
    provider.emit('accountsChanged', []);
    expect(session.getSnapshot()).toMatchObject({ status: 'idle', address: null, balance: null });
  });

  it('registers listeners once and removes each once, including repeated cleanup', async () => {
    const provider = mockProvider();
    const session = new WalletSession(() => provider);
    await session.connect();
    await session.connect();
    expect(provider.on).toHaveBeenCalledTimes(3);
    session.deactivate();
    session.deactivate();
    expect(provider.removeListener).toHaveBeenCalledTimes(3);
    provider.emit('accountsChanged', [ACCOUNT_B]);
    expect(session.getSnapshot().address).toBe(ACCOUNT_A);
    session.activate();
    expect(provider.on).toHaveBeenCalledTimes(6);
  });

  it('does not continue a request after unmounting or start duplicate connections', async () => {
    const pending = deferred();
    const provider = mockProvider();
    provider.request.mockImplementationOnce(() => pending.promise);
    const session = new WalletSession(() => provider);
    const connecting = session.connect();
    await session.connect();
    session.deactivate();
    pending.resolve([ACCOUNT_A]);
    await connecting;
    expect(provider.request).toHaveBeenCalledTimes(1);
    expect(provider.removeListener).toHaveBeenCalledTimes(3);
    expect(session.getSnapshot().address).toBeNull();
  });

  it('supports subscriptions without retaining observers after cleanup', async () => {
    const provider: EthereumProvider = mockProvider();
    const session = new WalletSession(() => provider);
    const observer = vi.fn();
    const unsubscribe = session.subscribe(observer);
    await session.connect();
    expect(observer).toHaveBeenCalled();
    unsubscribe();
    observer.mockClear();
    session.disconnect();
    expect(observer).not.toHaveBeenCalled();
  });
});
