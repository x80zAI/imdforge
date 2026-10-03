export const TOKEN_SCALE = 10n ** 18n;
export const MAX_TOKEN_AMOUNT = 1_000_000_000_000n * TOKEN_SCALE;

export class SimulationInputError extends Error {
  readonly field: 'amount' | 'pool' | 'retiredDaily' | 'days';

  constructor(field: SimulationInputError['field'], message: string) {
    super(message);
    this.name = 'SimulationInputError';
    this.field = field;
  }
}

export function parseTokenAmount(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d{1,13}(?:\.\d{1,18})?$/.test(normalized)) {
    throw new Error('Enter a positive number or zero, with up to 18 decimal places.');
  }
  const [whole, fraction = ''] = normalized.split('.');
  const amount = BigInt(whole) * TOKEN_SCALE + BigInt(fraction.padEnd(18, '0'));
  if (amount > MAX_TOKEN_AMOUNT) {
    throw new Error('Use an amount of 1 trillion IMD or less.');
  }
  return amount;
}

export interface SimulationInput {
  amount: string;
  pool: string;
  retiredDaily: string;
  days: number;
}

export interface SimulationResult {
  amount: bigint;
  pool: bigint;
  retiredDaily: bigint;
  days: number;
  share: bigint;
  dailyReward: bigint;
  reward: bigint;
}

export function calculateSimulation(input: SimulationInput): SimulationResult {
  const parsed: Record<'amount' | 'pool' | 'retiredDaily', bigint> = { amount: 0n, pool: 0n, retiredDaily: 0n };
  for (const field of ['amount', 'pool', 'retiredDaily'] as const) {
    try {
      parsed[field] = parseTokenAmount(input[field]);
    } catch (error) {
      throw new SimulationInputError(field, error instanceof Error ? error.message : 'Enter a valid amount.');
    }
  }
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 365) {
    throw new SimulationInputError('days', 'Choose a whole number of days from 1 to 365.');
  }
  const combinedPool = parsed.pool + parsed.amount;
  // Keep every token at 18 decimals and round only the final result down.
  const denominator = combinedPool * 1_000n;
  const numerator = parsed.amount * parsed.retiredDaily * 45n;
  return {
    ...parsed,
    days: input.days,
    share: combinedPool === 0n ? 0n : parsed.amount * TOKEN_SCALE / combinedPool,
    dailyReward: denominator === 0n ? 0n : numerator / denominator,
    reward: denominator === 0n ? 0n : numerator * BigInt(input.days) / denominator,
  };
}

export function formatTokenAmount(amount: bigint, digits = 2): string {
  if (!Number.isInteger(digits) || digits < 0 || digits > 18) throw new Error('Use 0 to 18 decimal places.');
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const whole = (absolute / TOKEN_SCALE).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = (absolute % TOKEN_SCALE).toString().padStart(18, '0').slice(0, digits);
  return `${negative ? '-' : ''}${whole}${digits > 0 ? `.${fraction}` : ''}`;
}

export function formatPoolShare(share: bigint): string {
  return `${formatTokenAmount(share * 100n, 2)}%`;
}
