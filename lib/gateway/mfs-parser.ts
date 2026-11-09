export type MfsParsedTransaction = {
  gateway: 'bkash' | 'nagad' | 'rocket' | 'upay';
  senderAddress: string;
  senderNumber: string | null;
  amount: number;
  balance: number | null;
  trxId: string;
  reference: string | null;
  rawSms: string;
};

// Whitelisted Telco Senders
const SENDER_WHITELIST: Record<string, 'bkash' | 'nagad' | 'rocket' | 'upay'> = {
  bkash: 'bkash',
  '16216': 'bkash',
  nagad: 'nagad',
  '16167': 'nagad',
  rocket: 'rocket',
  '16221': 'rocket',
  dbbl: 'rocket',
  upay: 'upay',
  '16268': 'upay',
};

/**
 * Validates whether the incoming SMS sender origin is an authentic MFS gateway.
 * Strictly rejects random personal phone numbers (e.g. 017xxxxxxxx) pretending to be bKash.
 */
export function isValidMfsSender(sender: string | null | undefined): boolean {
  if (!sender) return false;
  const clean = sender.trim().toLowerCase();
  for (const [key] of Object.entries(SENDER_WHITELIST)) {
    if (clean === key || clean.includes(key)) return true;
  }
  return false;
}

export function detectGatewayFromSender(sender: string): 'bkash' | 'nagad' | 'rocket' | 'upay' | null {
  const clean = sender.trim().toLowerCase();
  for (const [key, gw] of Object.entries(SENDER_WHITELIST)) {
    if (clean === key || clean.includes(key)) return gw;
  }
  return null;
}

/**
 * Universal & Provider-Specific Regex Parser for bKash, Nagad, Rocket, Upay.
 */
export function parseMfsSms(rawSms: string, originatingSender?: string): MfsParsedTransaction | null {
  if (!rawSms || typeof rawSms !== 'string') return null;
  const text = rawSms.trim();

  // 1. bKash Pattern
  // "You have received Tk 150.00 from 017XXXXXXXX. ... Balance Tk 5,400.00. ... TrxID ABC123XYZ at 09/11/2026"
  // Or with Ref: "Ref: ORD-123456"
  if (text.includes('received Tk') && (text.includes('TrxID') || text.includes('bKash'))) {
    const amountMatch = text.match(/received Tk\s*([\d,]+\.?\d*)/i);
    const senderMatch = text.match(/from\s*(\d{10,14})/i);
    const trxMatch = text.match(/TrxID\s*([A-Za-z0-9]+)/i);
    const balanceMatch = text.match(/Balance Tk\s*([\d,]+\.?\d*)/i);
    const refMatch = text.match(/Ref\s*[:\-]?\s*([A-Za-z0-9\-_]+)/i);

    if (amountMatch && trxMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      const trxId = trxMatch[1].trim().toUpperCase();
      const senderNumber = senderMatch ? normalizeBdPhone(senderMatch[1]) : null;
      const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : null;
      const reference = refMatch ? refMatch[1].trim() : null;

      if (!isNaN(amount) && trxId) {
        return {
          gateway: 'bkash',
          senderAddress: originatingSender || 'bKash',
          senderNumber,
          amount,
          balance,
          trxId,
          reference,
          rawSms: text,
        };
      }
    }
  }

  // 2. Nagad Pattern
  // "Cash In Tk 500.00 from 017XXXXXXXX successful. Fee Tk 0.00. Balance Tk 4,145.08. TrxID 6E63D2OS4R at ..."
  // or "Payment Tk 500.00 from 017XXXXXXXX ... TxnID 6E63D2OS4R"
  if (
    (text.includes('Cash In Tk') || text.includes('Send Money') || text.includes('Payment Tk') || text.includes('Nagad')) &&
    (text.includes('TxnID') || text.includes('TrxID'))
  ) {
    const amountMatch = text.match(/Tk\s*([\d,]+\.?\d*)/i);
    const senderMatch = text.match(/from\s*(\d{10,14})/i);
    const trxMatch = text.match(/(?:TrxID|TxnID)\s*([A-Za-z0-9]+)/i);
    const balanceMatch = text.match(/Balance Tk\s*([\d,]+\.?\d*)/i);
    const refMatch = text.match(/Ref\s*[:\-]?\s*([A-Za-z0-9\-_]+)/i);

    if (amountMatch && trxMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      const trxId = trxMatch[1].trim().toUpperCase();
      const senderNumber = senderMatch ? normalizeBdPhone(senderMatch[1]) : null;
      const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : null;
      const reference = refMatch ? refMatch[1].trim() : null;

      if (!isNaN(amount) && trxId) {
        return {
          gateway: 'nagad',
          senderAddress: originatingSender || 'Nagad',
          senderNumber,
          amount,
          balance,
          trxId,
          reference,
          rawSms: text,
        };
      }
    }
  }

  // 3. Rocket (DBBL) Pattern
  // "You have received Tk 400.00 from 017XXXXXXXX... Balance Tk 1,200.00. TrxID 96MPT9953516"
  if ((text.includes('Rocket') || text.includes('16221') || text.includes('DBBL')) || (text.includes('received Tk') && text.includes('TrxID'))) {
    const amountMatch = text.match(/received Tk\s*([\d,]+\.?\d*)/i);
    const senderMatch = text.match(/from\s*(\d{10,14})/i);
    const trxMatch = text.match(/(?:TrxID|TxnID)\s*([A-Za-z0-9]+)/i);
    const balanceMatch = text.match(/Balance Tk\s*([\d,]+\.?\d*)/i);
    const refMatch = text.match(/Ref\s*[:\-]?\s*([A-Za-z0-9\-_]+)/i);

    if (amountMatch && trxMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      const trxId = trxMatch[1].trim().toUpperCase();
      const senderNumber = senderMatch ? normalizeBdPhone(senderMatch[1]) : null;
      const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : null;
      const reference = refMatch ? refMatch[1].trim() : null;

      if (!isNaN(amount) && trxId) {
        return {
          gateway: 'rocket',
          senderAddress: originatingSender || '16221',
          senderNumber,
          amount,
          balance,
          trxId,
          reference,
          rawSms: text,
        };
      }
    }
  }

  // 4. Upay (UCB) Pattern
  // "Received Tk 300.00 from 018XXXXXXXX. Fee Tk 0.00. Balance Tk 1,500.00. TxnID: CA43X999. Ref: ..."
  if (text.includes('Upay') || text.includes('16268') || (text.includes('Received Tk') && text.includes('TxnID'))) {
    const amountMatch = text.match(/Received Tk\s*([\d,]+\.?\d*)/i);
    const senderMatch = text.match(/from\s*(\d{10,14})/i);
    const trxMatch = text.match(/TxnID\s*[:\-]?\s*([A-Za-z0-9]+)/i);
    const balanceMatch = text.match(/Balance Tk\s*([\d,]+\.?\d*)/i);
    const refMatch = text.match(/Ref\s*[:\-]?\s*([A-Za-z0-9\-_]+)/i);

    if (amountMatch && trxMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      const trxId = trxMatch[1].trim().toUpperCase();
      const senderNumber = senderMatch ? normalizeBdPhone(senderMatch[1]) : null;
      const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : null;
      const reference = refMatch ? refMatch[1].trim() : null;

      if (!isNaN(amount) && trxId) {
        return {
          gateway: 'upay',
          senderAddress: originatingSender || '16268',
          senderNumber,
          amount,
          balance,
          trxId,
          reference,
          rawSms: text,
        };
      }
    }
  }

  return null;
}

/**
 * Normalizes Bangladeshi phone numbers into standard format: 017XXXXXXXX (11 digits)
 */
export function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length === 13) {
    return digits.substring(2);
  }
  if (digits.length === 11 && digits.startsWith('01')) {
    return digits;
  }
  return digits;
}
