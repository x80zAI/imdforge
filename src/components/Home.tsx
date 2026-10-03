import { ArrowUpRight, ArrowRight, Calculator, Compass, ChatsCircle, BookOpen } from '@phosphor-icons/react';
import ForgeArt from './ForgeArt';
import { official } from '../lib/config';

export default function Home() {
  return <>
    <section className="home-hero" aria-labelledby="hero-title">
      <div className="home-hero-copy">
        <span className="eyebrow hero-eyebrow"><span aria-hidden="true">✳</span> AN INDEPENDENT SPACE FOR IMD</span>
        <h1 id="hero-title">The next chapter.<br /><em>Forged by you.</em></h1>
        <p>Understand the ecosystem. Calculate possible rewards.<br className="desktop-break" /> Give your next idea a place to take shape.</p>
        <div className="home-hero-actions"><a className="button" href="#calculate">Calculate rewards <ArrowRight size={18} /></a><a className="text-link" href="#explore">Discover IMD <ArrowUpRight size={17} /></a></div>
      </div>
      <ForgeArt />
      <dl className="home-foundations"><div><dt>CONNECTED TO</dt><dd>Ethereum</dd></div><div><dt>BUILT FOR</dt><dd>The IMD ecosystem</dd></div><div><dt>DESIGNED AROUND</dt><dd>Your perspective</dd></div></dl>
    </section>
    <section className="home-workspace" aria-labelledby="workspace-title">
      <div className="workspace-intro"><div><span className="eyebrow">MAKE YOUR NEXT MOVE</span><h2 id="workspace-title">A workspace.<br /><em>With a purpose.</em></h2></div><p>Start with the facts. Work through the numbers.<br />Then make room for the idea that comes next.</p></div>
      <div className="workspace-layout">
        <a className="workspace-feature" href="#calculate"><div className="feature-label"><span>01 / REWARDS CALCULATOR</span><Calculator size={25} weight="light" /></div><div className="feature-body"><span className="feature-number" aria-hidden="true">ƒ</span><h3>Put your<br />numbers to work.</h3><p>Choose an amount, activity level and time frame to estimate possible IMD rewards.</p></div><div className="feature-link">Open calculator <ArrowUpRight size={23} /></div></a>
        <div className="workspace-side">
          <a className="workspace-row" href="#explore"><div className="workspace-row-icon"><Compass size={28} weight="light" /></div><div><span className="eyebrow">02 / EXPLORE</span><h3>The foundation.</h3><p>Public Ethereum data, original contracts and the wider ecosystem.</p></div><ArrowUpRight className="workspace-arrow" size={22} /></a>
          <a className="workspace-row" href="#protocol"><div className="workspace-row-icon"><BookOpen size={28} weight="light" /></div><div><span className="eyebrow">03 / PROTOCOL</span><h3>Follow the flow.</h3><p>Understand how activity moves through the IMD mechanism.</p></div><ArrowUpRight className="workspace-arrow" size={22} /></a>
        </div>
      </div>
      <a className="workspace-ideas" href="#ideas"><div className="workspace-row-icon"><ChatsCircle size={29} weight="light" /></div><div><span className="eyebrow">04 / YOUR IDEAS</span><h3>Every next chapter starts somewhere.</h3><p>Give your idea a home. Save it in your browser and export it when you’re ready to share.</p></div><span className="ideas-link">Start writing <ArrowUpRight size={22} /></span></a>
    </section>
    <section className="home-principles" aria-labelledby="principles-title"><div className="principles-intro"><span className="eyebrow">A CLEAR FOUNDATION</span><h2 id="principles-title">Clarity comes first.</h2><a className="text-link" href={official.docs} target="_blank" rel="noopener noreferrer">Original POOL4 docs <ArrowUpRight size={16} /></a></div><div className="principles-grid"><div><span>01</span><h3>Your assets stay yours.</h3><p>Connect a wallet to read your IMD balance. IMDFORGE does not request transfers or signatures.</p></div><div><span>02</span><h3>Your inputs. Clear estimates.</h3><p>The calculator uses your assumptions. Actual rewards depend on activity and the protocol’s distribution.</p></div><div><span>03</span><h3>Your ideas, in your hands.</h3><p>Your personal board lives in this browser. Keep a copy by exporting your ideas whenever you need.</p></div></div></section>
  </>;
}
