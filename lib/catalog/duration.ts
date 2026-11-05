/** Parse UI duration labels like "1 Month" / "14 Days" into day counts. */
export function durationLabelToDays(duration: string): number {
  const match = duration.trim().match(/^(\d+)\s*(Day|Days|Month|Months)$/i);
  if (!match) return 30;
  const value = Number(match[1]);
  return /month/i.test(match[2]) ? value * 30 : value;
}
