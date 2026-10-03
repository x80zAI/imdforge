import { useEffect, useState, useSyncExternalStore } from 'react';
import { WalletSession, type EthereumProvider } from '../lib/wallet';

function browserProvider(): EthereumProvider | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum;
}

export function useWallet() {
  const [session] = useState(() => new WalletSession(browserProvider));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);

  useEffect(() => {
    session.activate();
    return () => session.deactivate();
  }, [session]);

  return { ...state, connect: session.connect, disconnect: session.disconnect };
}
