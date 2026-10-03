import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Copy, Check, Wallet, List, X, XLogo } from '@phosphor-icons/react';
import Home from './components/Home';
import Explore from './components/Explore';
import Protocol from './components/Protocol';
import Simulator from './components/Simulator';
import Community from './components/Community';
import WalletDialog from './components/WalletDialog';
import { useNetwork } from './hooks/useNetwork';
import { useWallet } from './hooks/useWallet';
import { IMD, official, social, shortAddress } from './lib/config';

const views = ['home', 'explore', 'calculate', 'protocol', 'ideas'] as const;
type View = typeof views[number];
const getView = (): View => views.find(view => window.location.hash === `#${view}`) ?? 'home';

export default function App() {
  const [view, setView] = useState<View>(getView);
  const [menu, setMenu] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [copyState, setCopyState] = useState('');
  const main = useRef<HTMLElement>(null);
  const network = useNetwork();
  const wallet = useWallet();
  useEffect(() => {
    const change = () => {
      const nextView = getView();
      setView(nextView); setMenu(false);
      if (views.some(item => window.location.hash === `#${item}`)) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        requestAnimationFrame(() => main.current?.focus({ preventScroll: true }));
      }
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => { document.title = `IMDFORGE · ${view === 'home' ? 'The next chapter. Forged by you.' : view === 'calculate' ? 'Rewards calculator' : view.charAt(0).toUpperCase() + view.slice(1)}`; }, [view]);
  async function copyAddress() {
    try { await navigator.clipboard.writeText(IMD); setCopyState('copied'); }
    catch { setCopyState('Copy unavailable. Find the full address in Explore.'); }
  }
  function prepareNavigation(nextView: View) {
    setMenu(false);
    if (nextView === view) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      main.current?.focus({ preventScroll: true });
    }
  }
  return <>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); main.current?.focus(); main.current?.scrollIntoView({ block: 'start' }); }}>Skip to content</a>
    <header className="site-header"><a href="#home" className="brand" aria-label="IMDFORGE home" onClick={() => prepareNavigation('home')}><img src="/favicon.svg" alt="" width="36" height="36" /><span>IMD<span className="brand-accent">FORGE</span></span></a>
      <nav className={menu ? 'main-nav mobile-open' : 'main-nav'} aria-label="Main navigation">{views.map(item => <a key={item} href={`#${item}`} onClick={() => prepareNavigation(item)} aria-current={view === item ? 'page' : undefined}>{item}</a>)}</nav>
      <div className="header-actions"><a className="icon-button header-social" href={social.x} target="_blank" rel="noopener noreferrer" aria-label="IMDFORGE on X" title="IMDFORGE on X"><XLogo size={17} aria-hidden="true" /></a><a className="imd-source" href={official.token} target="_blank" rel="noopener noreferrer" aria-label="Official IMD token website">imd</a><button className="icon-button header-copy" onClick={() => { void copyAddress(); }} aria-label="Copy IMD token address" title="Copy IMD token address">{copyState === 'copied' ? <Check size={17} /> : <Copy size={17} />}</button><button className="button wallet-button" aria-label={wallet.address ? 'Open wallet balance panel' : 'Connect wallet (read only)'} onClick={() => setWalletOpen(true)}><Wallet size={17} /><span>{wallet.address ? shortAddress(wallet.address) : 'Connect wallet'}</span></button><button className="icon-button menu-toggle" aria-expanded={menu} aria-label={menu ? 'Close navigation' : 'Open navigation'} onClick={() => setMenu(value => !value)}>{menu ? <X size={21} /> : <List size={21} />}</button></div>
    </header>
    <div className="network-strip" aria-label="Workspace status"><div><span className={`status-dot ${network.status}`} /><strong>{network.status === 'live' ? 'ETHEREUM DATA' : network.status === 'loading' ? 'READING ETHEREUM' : 'DATA UNAVAILABLE'}</strong></div><div>BLOCK <strong>{network.data ? `#${network.data.block.toLocaleString('en-US')}` : 'PENDING'}</strong></div><div>WALLET <strong>READ ONLY</strong></div><div>REWARDS <strong>CALCULATOR</strong></div><div>IDEAS <strong>YOUR PERSONAL BOARD</strong></div><a href={official.docs} target="_blank" rel="noopener noreferrer">IMD ECOSYSTEM <ArrowUpRight size={12} /></a></div>
    <span className="sr-only" role="status">{copyState === 'copied' ? 'IMD token address copied.' : copyState}</span>
    <main className="site-main" id="main" ref={main} tabIndex={-1}>{view === 'home' && <Home />}{view === 'explore' && <Explore network={network} />}<div hidden={view !== 'calculate'}><Simulator vaultAssets={network.data?.vaultAssets ?? null} /></div>{view === 'protocol' && <Protocol />}<div hidden={view !== 'ideas'}><Community /></div></main>
    <footer className="site-footer"><a href="#home" className="footer-brand" onClick={() => prepareNavigation('home')}>IMDFORGE<span>Independent workspace for the IMD ecosystem.</span></a><div><a href={social.x} target="_blank" rel="noopener noreferrer" aria-label="IMDFORGE on X"><XLogo size={14} aria-hidden="true" /> @IMDFORGE <ArrowUpRight size={14} aria-hidden="true" /></a><a href={official.docs} target="_blank" rel="noopener noreferrer">Original docs <ArrowUpRight size={14} /></a><span className="footer-network"><span className="ethereum-diamond">◈</span> Ethereum</span></div></footer>
    <WalletDialog open={walletOpen} close={() => setWalletOpen(false)} wallet={wallet} />
  </>;
}
