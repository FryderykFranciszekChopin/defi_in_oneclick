export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatAmount(amount: string, decimals: number = 6): string {
  const num = parseFloat(amount);
  if (num === 0) return '0';
  if (num < 0.000001) return '<0.000001';
  return num.toFixed(decimals).replace(/\.?0+$/, '');
}