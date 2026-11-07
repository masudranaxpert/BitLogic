/** wa.me link, or null when the number is missing or too short. */
export function whatsappHref(raw: string, text?: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8) return null;
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
