export const IMD = '0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7';
export const VAULT = '0x9efa934d9fad4ae28c998a40195646b965a97247';
export const social = { x: 'https://x.com/IMDFORGE' };
export const official = {
  token: 'https://imd.fun/token/',
  pool: 'https://pool4.imd.fun/',
  docs: 'https://pool4.imd.fun/docs',
  explorer: 'https://explorer.imd.fun/',
  coins: 'https://communitycoins.imd.fun/'
};
export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
export function formatIMD(value: string | null, digits = 2) {
  if (value === null) return 'Unavailable';
  const number = Number(value);
  if (!Number.isFinite(number)) return 'Unavailable';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(number);
}
