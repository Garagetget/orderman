/** Formats a number as Thai Baht, e.g. 1250 → "1,250 ฿". */
export function formatBaht(amount: number): string {
  return `${amount.toLocaleString("th-TH", { maximumFractionDigits: 2 })} ฿`;
}
