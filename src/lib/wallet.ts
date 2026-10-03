export const IMD_TOKEN_ADDRESS = '0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7';
export const READ_ONLY_METHODS = ['eth_requestAccounts', 'eth_accounts', 'eth_chainId', 'eth_call'] as const;

type WalletEvent = 'accountsChanged' | 'chainChanged' | 'disconnect';
type WalletListener = (value?: unknown) => void;
export interface EthereumProvider {
  request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: WalletEvent, listener: WalletListener) => void;
  removeListener?: (event: WalletEvent, listener: WalletListener) => void;
}
export interface WalletState {
  address: string | null;
  balance: string | null;
  chainId: string | null;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  message: string;
}

const initialState = (): WalletState => ({
  address: null, balance: null, chainId: null, status: 'idle', message: '',
});
class WalletResponseError extends Error {}

export function readOnlyRequest(provider: EthereumProvider, method: string, params?: unknown[]) {
  if (!(READ_ONLY_METHODS as readonly string[]).includes(method)) {
    throw new WalletResponseError('This wallet operation is not available.');
  }
  return provider.request(params === undefined ? { method } : { method, params });
}

export function parseWalletAccount(value: unknown): string | null {
  if (!Array.isArray(value) || value.some((account) => typeof account !== 'string'
    || !/^0x[0-9a-fA-F]{40}$/.test(account))) {
    throw new WalletResponseError('Your wallet returned an invalid account. Please reconnect.');
  }
  return value[0] ?? null;
}

export function parseChainId(value: unknown): string {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{1,64}$/.test(value)) {
    throw new WalletResponseError('Could not identify your wallet network. Please reconnect.');
  }
  return `0x${BigInt(value).toString(16)}`;
}

export function formatTokenBalance(value: unknown): string {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new WalletResponseError('Could not read a valid IMD balance. Please try again.');
  }
  const amount = BigInt(value);
  const unit = 10n ** 18n;
  const fraction = (amount % unit).toString().padStart(18, '0').replace(/0+$/, '');
  return `${amount / unit}${fraction ? `.${fraction}` : ''}`;
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 4001) {
    return 'Connection cancelled in your wallet. You can try again whenever you are ready.';
  }
  return error instanceof WalletResponseError ? error.message
    : 'Could not connect to your wallet or read its balance. Please try again.';
}

/** A local, read-only session. A revision invalidates every superseded async request. */
export class WalletSession {
  private state = initialState();
  private listeners = new Set<() => void>();
  private provider: EthereumProvider | undefined;
  private listening = false;
  private active = true;
  private engaged = false;
  private revision = 0;

  constructor(private getProvider: () => EthereumProvider | undefined) {}

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(state: WalletState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
  private current(revision: number) {
    return this.active && this.engaged && revision === this.revision;
  }
  private listen() {
    if (this.listening || !this.provider?.on) return;
    this.provider.on('accountsChanged', this.accountsChanged);
    this.provider.on('chainChanged', this.chainChanged);
    this.provider.on('disconnect', this.providerDisconnected);
    this.listening = true;
  }
  private unlisten() {
    if (!this.listening) return;
    this.provider?.removeListener?.('accountsChanged', this.accountsChanged);
    this.provider?.removeListener?.('chainChanged', this.chainChanged);
    this.provider?.removeListener?.('disconnect', this.providerDisconnected);
    this.listening = false;
  }
  activate() { this.active = true; this.listen(); }
  deactivate() { this.active = false; this.revision++; this.unlisten(); }

  connect = async () => {
    if (!this.active || this.state.status === 'connecting') return;
    const revision = ++this.revision;
    this.engaged = true;
    this.update({ ...initialState(), status: 'connecting', message: 'Confirm the connection in your wallet.' });
    try {
      const provider = this.getProvider();
      if (!provider || typeof provider.request !== 'function') {
        throw new WalletResponseError('No wallet was found. Open this page in a wallet browser or install a browser wallet.');
      }
      if (provider !== this.provider) { this.unlisten(); this.provider = provider; }
      this.listen();
      const accounts = await readOnlyRequest(provider, 'eth_requestAccounts');
      if (this.current(revision)) await this.hydrate(accounts, revision);
    } catch (error) { this.fail(error, revision); }
  };

  disconnect = () => {
    this.engaged = false;
    this.revision++;
    this.update(initialState());
  };

  private fail(error: unknown, revision: number) {
    if (this.current(revision)) {
      this.update({ ...initialState(), status: 'error', message: errorMessage(error) });
    }
  }
  private async hydrate(accounts: unknown, revision: number) {
    try {
      const address = parseWalletAccount(accounts);
      if (!address) {
        this.disconnect();
        return;
      }
      const provider = this.provider;
      if (!provider || !this.current(revision)) return;
      this.update({ ...initialState(), address, status: 'connecting', message: 'Reading your IMD balance.' });
      const chainId = parseChainId(await readOnlyRequest(provider, 'eth_chainId'));
      if (!this.current(revision)) return;
      if (chainId !== '0x1') {
        this.update({ address, balance: null, chainId, status: 'error',
          message: 'Switch your wallet to Ethereum Mainnet, then connect again.' });
        return;
      }
      const data = `0x70a08231${address.slice(2).toLowerCase().padStart(64, '0')}`;
      const result = await readOnlyRequest(provider, 'eth_call', [{ to: IMD_TOKEN_ADDRESS, data }, 'latest']);
      if (!this.current(revision)) return;
      const balance = formatTokenBalance(result);
      this.update({ address, balance, chainId, status: 'connected', message: 'Connected to Ethereum. Your IMD balance is read only.' });
    } catch (error) { this.fail(error, revision); }
  }
  private accountsChanged: WalletListener = (accounts) => {
    if (this.active && this.engaged) void this.hydrate(accounts, ++this.revision);
  };
  private chainChanged: WalletListener = (value) => {
    if (!this.active || !this.engaged || !this.provider) return;
    const revision = ++this.revision;
    try {
      const chainId = parseChainId(value);
      if (chainId !== '0x1') {
        this.update({ ...this.state, balance: null, chainId, status: 'error',
          message: 'Switch your wallet to Ethereum Mainnet, then connect again.' });
        return;
      }
      this.update({ ...this.state, balance: null, chainId, status: 'connecting', message: 'Reading your IMD balance.' });
      void readOnlyRequest(this.provider, 'eth_accounts')
        .then((accounts) => this.current(revision) ? this.hydrate(accounts, revision) : undefined)
        .catch((error: unknown) => this.fail(error, revision));
    } catch (error) { this.fail(error, revision); }
  };
  private providerDisconnected = () => {
    if (!this.active || !this.engaged) return;
    this.disconnect();
    this.update({ ...initialState(), message: 'Wallet disconnected. Connect again to read your balance.' });
  };
}
