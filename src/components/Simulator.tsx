import { useId, useMemo, useState } from 'react';
import { ArrowDown, ArrowUpRight, Calculator, Info, Lightning } from '@phosphor-icons/react';
import { calculateSimulation, formatPoolShare, formatTokenAmount, parseTokenAmount, SimulationInputError } from '../lib/simulator';
import '../styles/tools.css';

interface SimulatorProps {
  vaultAssets: string | null;
}

export default function Simulator({ vaultAssets }: SimulatorProps) {
  const fieldId = useId();
  const [amount, setAmount] = useState('1000');
  const [pool, setPool] = useState('100000');
  const [retiredDaily, setRetiredDaily] = useState('10000');
  const [days, setDays] = useState(30);
  const [poolNotice, setPoolNotice] = useState<string | null>(null);
  const calculation = useMemo(() => {
    try {
      return { result: calculateSimulation({ amount, pool, retiredDaily, days }), error: null };
    } catch (error) {
      return { result: null, error: error instanceof SimulationInputError ? error : new SimulationInputError('amount', 'Check the amounts and try again.') };
    }
  }, [amount, pool, retiredDaily, days]);
  const result = calculation.result;
  const livePoolAvailable = useMemo(() => {
    if (vaultAssets === null) return false;
    try { parseTokenAmount(vaultAssets); return true; } catch { return false; }
  }, [vaultAssets]);
  const comparison = result ? [7, 30, 90].map(horizon => ({
    horizon,
    result: calculateSimulation({ amount, pool, retiredDaily, days: horizon }),
  })) : [];

  function useLivePool() {
    if (vaultAssets !== null && livePoolAvailable) {
      setPool(vaultAssets);
      setPoolNotice('The current vault total is now the starting pool for this scenario. Future changes are not included.');
    }
  }

  const tokenFields = [
    { key: 'amount', label: 'Your IMD amount', value: amount, set: setAmount },
    { key: 'pool', label: 'Existing vault pool', value: pool, set: setPool },
    { key: 'retiredDaily', label: 'Daily IMD retired', value: retiredDaily, set: setRetiredDaily },
  ] as const;

  return (
    <section className="simulator-section" id="calculate" aria-labelledby="calculator-title">
      <div className="simulator-heading">
        <div>
          <p className="eyebrow"><Calculator size={15} aria-hidden="true" /> REWARDS CALCULATOR</p>
          <h1 className="section-title" id="calculator-title">Your share.<br /><span>Estimated rewards.</span></h1>
        </div>
        <p className="simulator-intro">Calculate your share of IMD retirement rewards using an amount, a vault total and a time horizon.</p>
      </div>

      <div className="simulator-grid">
        <div className="panel simulator-inputs">
          <div className="simulator-panel-heading"><h2>Set your inputs</h2><span className="simulator-mode">CALCULATOR</span></div>
          <div className="simulator-fields">
            {tokenFields.map(field => (
              <div className="simulator-field" key={field.key}>
                <label htmlFor={`${fieldId}-${field.key}`}>{field.label}</label>
                <div className={`simulator-input-wrap${calculation.error?.field === field.key ? ' simulator-input-error' : ''}`}>
                  <input
                    id={`${fieldId}-${field.key}`}
                    type="text"
                    inputMode="decimal"
                    value={field.value}
                    autoComplete="off"
                    maxLength={32}
                    onChange={event => { field.set(event.target.value); if (field.key === 'pool') setPoolNotice(null); }}
                    aria-invalid={calculation.error?.field === field.key}
                    aria-describedby={calculation.error?.field === field.key ? `${fieldId}-error` : undefined}
                  />
                  <span>IMD</span>
                </div>
                {field.key === 'pool' && (
                  <button className="simulator-live-button" type="button" onClick={useLivePool} disabled={!livePoolAvailable}>
                    <ArrowDown size={12} aria-hidden="true" /> {livePoolAvailable ? 'Use current vault total' : 'Current vault total unavailable'}
                  </button>
                )}
                {field.key === 'retiredDaily' && <small>Assumed daily activity. This value is not a live feed.</small>}
              </div>
            ))}
          </div>
          <div className="simulator-horizon">
            <div><label htmlFor={`${fieldId}-days`}>Time horizon</label><span>{days} days</span></div>
            <input id={`${fieldId}-days`} type="range" min="1" max="365" value={days} onChange={event => setDays(Number(event.target.value))} />
            <div className="simulator-presets" aria-label="Time horizon presets">
              {[7, 30, 90, 365].map(value => <button key={value} type="button" className={days === value ? 'simulator-preset-active' : ''} aria-pressed={days === value} onClick={() => setDays(value)}>{value === 365 ? '1 year' : `${value} days`}</button>)}
            </div>
          </div>
          {poolNotice && <p className="simulator-field-note" role="status">{poolNotice}</p>}
          {calculation.error && <p className="simulator-error" id={`${fieldId}-error`} role="alert">{calculation.error.message}</p>}
          <p className="simulator-assumption"><Info size={16} aria-hidden="true" /><span>Assumes 4.5% of retired IMD goes to the vault, with constant pool shares and daily activity. Dripper timing and other deposits or withdrawals are not included.</span></p>
        </div>

        <div className="panel simulator-output" aria-live="polite" aria-atomic="true">
          <div className="simulator-output-label"><span><Lightning size={14} weight="fill" aria-hidden="true" /> ESTIMATED REWARDS</span><span>{days} DAYS</span></div>
          <div className="simulator-total">{result ? formatTokenAmount(result.reward, 4) : '—'} <span>IMD</span></div>
          <p className="simulator-output-caption">Estimated from your inputs, with no guaranteed return.</p>
          <div className="simulator-chart" aria-hidden="true">
            <svg viewBox="0 0 380 128" preserveAspectRatio="none">
              <defs><linearGradient id={`${fieldId}-chart-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".17" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
              {[28, 66, 104].map(y => <line key={y} x1="8" y1={y} x2="370" y2={y} stroke="var(--line)" strokeDasharray="3 5" />)}
              {result && result.reward > 0n ? <><path d="M8 112 L370 20 L370 122 L8 122 Z" fill={`url(#${fieldId}-chart-fill)`} /><path d="M8 112 L370 20" fill="none" stroke="var(--accent)" strokeWidth="2" /><circle cx="370" cy="20" r="4" fill="var(--accent)" /></> : <line x1="8" y1="112" x2="370" y2="112" stroke="var(--muted)" strokeWidth="2" />}
            </svg>
            <div className="simulator-chart-axis"><span>DAY 0 · 0 IMD</span><span>{result ? formatTokenAmount(result.reward, 2) : '—'} IMD · DAY {days}</span></div>
          </div>
          <div className="simulator-stats">
            <div><span>Share of total pool</span><strong>{result ? formatPoolShare(result.share) : '—'}</strong></div>
            <div><span>Estimated per day</span><strong>{result ? formatTokenAmount(result.dailyReward, 4) : '—'} <small>IMD</small></strong></div>
          </div>
          <div className="simulator-comparison">
            <div className="simulator-comparison-heading"><h2>Compare time horizons</h2><ArrowUpRight size={16} aria-hidden="true" /></div>
            <table><caption className="simulator-sr-only">Estimated rewards at different time horizons</caption><thead><tr><th scope="col">Horizon</th><th scope="col">Estimated IMD</th></tr></thead><tbody>{comparison.length > 0 ? comparison.map(row => <tr key={row.horizon}><th scope="row">{row.horizon} days</th><td>{formatTokenAmount(row.result.reward, 4)}</td></tr>) : <tr><td colSpan={2}>Enter valid amounts to compare horizons.</td></tr>}</tbody></table>
          </div>
        </div>
      </div>
      <p className="simulator-disclaimer">Rewards are estimates from the inputs above. Actual rewards depend on pool size, retirement activity and contract rules. This calculator does not deposit IMD or send transactions.</p>
    </section>
  );
}
