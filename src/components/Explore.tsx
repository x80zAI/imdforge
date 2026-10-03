import { ArrowUpRight, Copy, Check, ArrowRight } from '@phosphor-icons/react';
import { useState } from 'react';
import type { NetworkState } from '../hooks/useNetwork';
import { IMD, VAULT, official, formatIMD, shortAddress } from '../lib/config';

export default function Explore({ network }: { network: NetworkState }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(IMD); setCopied(true); setCopyError(''); }
    catch { setCopyError('Copy is unavailable here. Select the full address below.'); }
  }
  const missing = network.status === 'loading' ? 'Loading…' : 'Unavailable';
  const data = network.data;
  return <section className="workspace-page">
    <div className="section-heading"><span className="eyebrow">EXPLORE / ETHEREUM</span><h1>Follow the <em>signal.</em></h1><p>Public data, original contracts and a direct path to the IMD ecosystem.</p></div>
    <div className={`notice network-notice ${network.status}`} role="status">{data ? <>Ethereum snapshot · block #{data.block.toLocaleString('en-US')} · read at {new Date(data.updatedAt).toLocaleTimeString('en-GB', { timeZone: 'UTC' })} UTC</> : network.status === 'loading' ? 'Reading Ethereum data…' : 'Live data unavailable. The original contracts and links are still available.'}</div>
    <dl className="metric-grid"><div><dt>ETHEREUM BLOCK</dt><dd>{data ? data.block.toLocaleString('en-US') : missing}</dd><span>Public Ethereum reading</span></div><div><dt>IMD ON ETHEREUM</dt><dd>{data ? formatIMD(data.totalSupply, 0) : missing}</dd><span>Supply on this network only</span></div><div><dt>IMD IN THE VAULT</dt><dd>{data ? formatIMD(data.vaultAssets, 0) : missing}</dd><span>IMD backing sIMD shares</span></div><div><dt>DOCUMENTED ALLOCATION</dt><dd>4.5<span className="metric-unit">%</span></dd><span>Of retired IMD · not annual interest</span></div></dl>
    <div className="explore-layout"><div className="panel contract-panel"><h2>The foundation.</h2><p>Original IMD contracts on Ethereum. IMDFORGE is an independent workspace.</p><div className="contract-item"><div><span>IMD TOKEN</span><a href={`https://etherscan.io/address/${IMD}`} target="_blank" rel="noopener noreferrer">{shortAddress(IMD)} <ArrowUpRight size={17} /></a></div><button className="icon-button" onClick={() => { void copy(); }} aria-label="Copy IMD token address">{copied ? <Check size={20} /> : <Copy size={20} />}</button></div><code className="full-address">{IMD}</code><span className="copy-status" role="status">{copyError || (copied ? 'IMD address copied.' : '')}</span><div className="contract-item"><div><span>SIMD VAULT</span><a href={`https://etherscan.io/address/${VAULT}`} target="_blank" rel="noopener noreferrer">{shortAddress(VAULT)} <ArrowUpRight size={17} /></a></div><span className="outline-label">ERC-4626</span></div><a className="text-link" href={official.docs} target="_blank" rel="noopener noreferrer">Check the source documentation <ArrowUpRight size={17} /></a></div>
    <div className="ecosystem-links"><a href={official.token} target="_blank" rel="noopener noreferrer"><span className="eyebrow">THE ORIGINAL</span><h2>identity.md <ArrowUpRight size={21} /></h2><p>Token information and the wider ecosystem.</p></a><a href={official.pool} target="_blank" rel="noopener noreferrer"><span className="eyebrow">MARKET & VAULT</span><h2>POOL4 <ArrowUpRight size={21} /></h2><p>Visit the original swap and staking app.</p></a><a href={official.explorer} target="_blank" rel="noopener noreferrer"><span className="eyebrow">THE NETWORK</span><h2>Agent explorer <ArrowUpRight size={21} /></h2><p>Explore the public identity.md agent network.</p></a></div></div>
    <a className="explore-next" href="#calculate"><span>Turn the data into a scenario.</span><span>Open calculator <ArrowRight size={20} /></span></a>
  </section>;
}
