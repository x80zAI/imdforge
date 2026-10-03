import { useRef } from 'react';

export default function ForgeArt() {
  const frame = useRef<HTMLDivElement>(null);
  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    frame.current?.style.setProperty('--turn', `${(event.clientX - box.left - box.width / 2) / 90}deg`);
  }
  return <div className="forge-art" ref={frame} onPointerMove={move} onPointerLeave={() => frame.current?.style.setProperty('--turn', '0deg')}>
    <div className="art-caption art-caption-left"><span className="eyebrow">01 / THE FOUNDATION</span><strong>One ecosystem.<br />Open possibilities.</strong><span>IMD · Ethereum</span></div>
    <div className="forge-glow" />
    <div className="forge-reticle" aria-hidden="true" />
    <img className="forge-emblem" src="/forge-emblem.svg" width="600" height="600" alt="IMDFORGE emblem: an open copper ring holding a sculpted ivory F" />
    <div className="art-caption art-caption-right"><span className="eyebrow">02 / THE MINDSET</span><strong>Understand.<br />Calculate. Create.</strong><span>Your next move, considered.</span></div>
    <span className="art-registration" aria-hidden="true">F / 001</span>
  </div>;
}
