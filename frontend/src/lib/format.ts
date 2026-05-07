export const LKR = (amount: number) =>
  new Intl.NumberFormat('si-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(amount);

export const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-LK');
