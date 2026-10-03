import { useEffect, useRef } from 'react';
import { X, Wallet, ArrowUpRight } from '@phosphor-icons/react';
import type { useWallet } from '../hooks/useWallet';
import { shortAddress } from '../lib/config';

export default function WalletDialog({ open, close, wallet }: { open: boolean; close: () => void; wallet: ReturnType<typeof useWallet> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <dialog className="wallet-dialog" ref={dialog} onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }} aria-labelledby="wallet-title">
    <div className="wallet-dialog-content"><button className="icon-button dialog-close" onClick={close} aria-label="Close wallet panel"><X size={21} /></button><div className="wallet-symbol"><Wallet size={30} weight="light" /></div><span className="eyebrow">YOUR WALLET / READ ONLY</span><h2 id="wallet-title">A view of <em>your IMD.</em></h2><p>Connect to read your address and IMD balance on Ethereum. This workspace does not ask you to sign or move funds.</p>
    {wallet.address && <div className="wallet-position"><span>CONNECTED ADDRESS</span><a href={`https://etherscan.io/address/${wallet.address}`} target="_blank" rel="noopener noreferrer">{shortAddress(wallet.address)} <ArrowUpRight size={16} /></a><span>IMD BALANCE</span><strong>{wallet.balance !== null ? `${wallet.balance} IMD` : wallet.status === 'connecting' ? 'Reading your balance…' : 'Unavailable'}</strong><span>NETWORK</span><strong>{wallet.chainId === '0x1' ? 'Ethereum' : wallet.chainId ? 'Switch your wallet to Ethereum' : wallet.status === 'connecting' ? 'Reading your network…' : 'Unavailable'}</strong></div>}
    <div className="wallet-feedback" role="status">{wallet.message}</div>
    {wallet.address ? <button className="button button-secondary" onClick={wallet.disconnect}>Disconnect from this page</button> : <button className="button" onClick={() => { void wallet.connect(); }} disabled={wallet.status === 'connecting'}>{wallet.status === 'connecting' ? 'Waiting for your wallet…' : 'Connect browser wallet'}<Wallet size={18} /></button>}
    <small>Your wallet address is not saved by IMDFORGE.</small></div>
  </dialog>;
}
