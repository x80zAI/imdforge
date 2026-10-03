import { useEffect, useState } from 'react';

export type NetworkSnapshot = {
  status: 'live'; block: number; totalSupply: string; vaultAssets: string;
  updatedAt: string; source: string;
};
export type NetworkState = {
  status: 'loading' | 'live' | 'unavailable'; data: NetworkSnapshot | null;
};
export function useNetwork(): NetworkState {
  const [state, setState] = useState<NetworkState>({ status: 'loading', data: null });
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    let pending = false;
    async function refresh() {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const response = await fetch('/api/network', { signal: controller.signal });
        if (!response.ok) throw new Error('Unavailable');
        const data = await response.json() as Partial<NetworkSnapshot>;
        if (data.status !== 'live' || !Number.isSafeInteger(data.block) ||
          typeof data.totalSupply !== 'string' || typeof data.vaultAssets !== 'string' ||
          typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt)) ||
          !/^\d+(\.\d+)?$/.test(data.totalSupply) || !/^\d+(\.\d+)?$/.test(data.vaultAssets)) {
          throw new Error('Invalid snapshot');
        }
        if (alive) setState({ status: 'live', data: data as NetworkSnapshot });
      } catch {
        if (alive) setState({ status: 'unavailable', data: null });
      } finally { pending = false; }
    }
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 60000);
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  return state;
}
