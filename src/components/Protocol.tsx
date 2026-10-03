import { ArrowUpRight, ArrowRight } from '@phosphor-icons/react';
import { official } from '../lib/config';

const allocations = [
  { size: '85%', title: 'Burned', text: 'Destroyed on Base, through the protocol’s burn path.', cls: 'allocation-burn' },
  { size: '4.5%', title: 'sIMD stakers', text: 'Allocated to the dripper, then streamed into the vault.', cls: 'allocation-stakers' },
  { size: '6%', title: 'Orchestrator reserve', text: 'Reserved for the protocol’s bonding and inference program.', cls: 'allocation-reserve' },
  { size: '4.5%', title: 'Node reserve', text: 'Reserved for the planned NFT inference node program.', cls: 'allocation-nodes' }
];
export default function Protocol() {
  return <section className="workspace-page protocol-page">
    <div className="section-heading"><span className="eyebrow">PROTOCOL / HOW IT FLOWS</span><h1>Understand the <em>underneath.</em></h1><p>How the original POOL4 design connects market activity, retired IMD and the sIMD vault.</p></div>
    <div className="protocol-path"><div><span>01</span><strong>Market activity</strong><p>Trading can push pool inventory above its cap.</p></div><ArrowRight className="path-arrow" size={23} /><div><span>02</span><strong>IMD retirement</strong><p>The hook trims excess IMD according to its rules.</p></div><ArrowRight className="path-arrow" size={23} /><div><span>03</span><strong>Rewards & reserves</strong><p>The retired IMD follows the documented split.</p></div></div>
    <div className="allocation-heading"><h2>Where each 100 IMD goes.</h2><p>Documented allocation of retired IMD. Protocol settings can change this split; it is not an annual return.</p></div>
    <div className="allocation-strip" aria-label="85 percent burned, 4.5 percent staking, 6 percent orchestrator reserve, 4.5 percent node reserve"><span /><span /><span /><span /></div>
    <div className="allocation-grid">{allocations.map(item => <div className={item.cls} key={item.title}><span className="allocation-size">{item.size}</span><h3>{item.title}</h3><p>{item.text}</p></div>)}</div>
    <div className="how-panels protocol-details"><div className="panel"><h2>The vault, simply.</h2><p>In the original protocol, depositing IMD into the vault gives you sIMD shares. Rewards increase the IMD backing those shares.</p><p>Your share count can stay the same while the IMD behind each share changes. The calculator estimates rewards from the amounts and assumptions you choose.</p><a className="text-link" href="#calculate">Explore a scenario <ArrowRight size={17} /></a></div><div className="panel"><h2>Know what you’re looking at.</h2><ul className="plain-list"><li>4.5% is an allocation from retired IMD, not a promised APR.</li><li>The dripper controls when allocated rewards reach the vault.</li><li>Reserve allocations do not prove their programs are live.</li><li>IMDFORGE does not accept deposits or issue a reward token.</li></ul></div></div>
    <div className="source-note"><div><strong>Read the original source.</strong><p>POOL4 describes the protocol as experimental and unaudited, with owner-controlled settings. Review its current documentation before using it.</p></div><a className="button button-secondary" href={official.docs} target="_blank" rel="noopener noreferrer">POOL4 documentation <ArrowUpRight size={17} /></a></div>
  </section>;
}
