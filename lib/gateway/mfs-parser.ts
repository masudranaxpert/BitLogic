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

const BANGLA_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

export function normalizeBanglaDigits(input: string): string {
  return input.replace(/[০-৯]/g, (ch) => BANGLA_DIGITS[ch] ?? ch);
}

/**
 * Validates whether the incoming SMS sender origin is an authentic MFS gateway.
 * Strictly rejects random personal phone numbers (e.g. 017xxxxxxxx, even if containing 16216/16167) pretending to be bKash/Nagad.
 */
export function isValidMfsSender(sender: string | null | undefined): boolean {
  if (!sender) return false;
  const clean = normalizeBanglaDigits(sender).trim().toLowerCase();
  if (clean === 'test_ping') return true;
  // Never accept standard 10-14 digit personal mobile numbers as MFS sender headers
  const digitsOnly = clean.replace(/\D/g, '');
  if (/^(?:88)?01[3-9]\d{8,9}$/.test(digitsOnly)) return false;
  if (SENDER_WHITELIST[clean]) return true;
  // Allow alphanumeric operator sender headers like "bKash", "NAGAD", "16216", "+16216", "DBBL-Rocket"
  const tokenClean = clean.replace(/^[+.\s-]+|[.\s-]+$/g, '');
  if (SENDER_WHITELIST[tokenClean]) return true;
  if (/^(?:bkash|nagad|rocket|dbbl[\s\-_]*rocket|upay)$/i.test(tokenClean)) return true;
  return false;
}

export function detectGatewayFromSender(sender: string): 'bkash' | 'nagad' | 'rocket' | 'upay' | null {
  if (!sender) return null;
  const clean = normalizeBanglaDigits(sender).trim().toLowerCase();
  const digitsOnly = clean.replace(/\D/g, '');
  if (/^(?:88)?01[3-9]\d{8,9}$/.test(digitsOnly)) return null;
  const tokenClean = clean.replace(/^[+.\s-]+|[.\s-]+$/g, '');
  if (SENDER_WHITELIST[tokenClean]) return SENDER_WHITELIST[tokenClean];
  if (/^dbbl/i.test(tokenClean)) return 'rocket';
  return null;
}

/**
 * Extracts a clean 5-24 character uppercase alphanumeric TrxID even when a user pastes
 * the entire bKash/Nagad/Rocket confirmation SMS into the TrxID input box.
 */
export function extractCleanTrxId(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') return '';
  const text = normalizeBanglaDigits(rawInput).trim();
  const labeled = text.match(
    /\b(?:TrxID|TxnID|Trans\.?\s*ID|Transaction\s*ID|TxID)\s*[:\-=]?\s*([A-Za-z0-9]{5,24})\b/i,
  );
  if (labeled) return labeled[1].toUpperCase();
  // If user pasted a single token (possibly with spaces around it)
  const compact = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // If input looks like a full sentence (> 24 chars or multiple spaces), don't concatenate the whole sentence!
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 2 || compact.length > 24) {
    // Look for a standalone 8-12 char alphanumeric token containing both letters and digits (typical bKash/Nagad/Rocket TrxID)
    const token = words
      .map((w) => w.replace(/[^A-Za-z0-9]/g, '').toUpperCase())
      .find((w) => w.length >= 6 && w.length <= 20 && /[0-9]/.test(w) && /[A-Z]/.test(w) && !/^(?:88)?01[3-9]\d{8}$/.test(w));
    return token || '';
  }
  return compact;
}

/**
 * Universal & Provider-Specific Regex Parser for bKash, Nagad, Rocket, Upay.
 * Normalizes Bangla numerals and multiline whitespace before extraction.
 * Strictly rejects outgoing debit SMS (Send Money to, Cash Out, Payment to, Mobile Recharge, Failed/Reversed).
 */
export function parseMfsSms(rawSms: string, originatingSender?: string): MfsParsedTransaction | null {
  if (!rawSms || typeof rawSms !== 'string') return null;
  if (originatingSender && originatingSender.trim() && !isValidMfsSender(originatingSender)) {
    return null;
  }
  const normalizedText = normalizeBanglaDigits(rawSms)
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Reject outgoing / debit / failed / promotional / OTP messages on the merchant SIM
  if (
    /\b(?:Cash\s*Out|Mobile\s*Recharge|Bill\s*Pay|Pay\s*Bill|Send\s*Money\s*(?:Tk\.?|BDT)?\s*[\d,.]+\s*to|sent\s*(?:Tk\.?|BDT)?\s*[\d,.]+\s*to|Payment\s*(?:Tk\.?|BDT)?\s*[\d,.]+\s*to|transferred\s+to|Request\s+for|requested|failed|cancelled|reversed|refunded|OTP|verification\s*code|pin\s*reset)\b/i.test(
      normalizedText,
    )
  ) {
    return null;
  }

  // Require positive incoming credit indicator
  const hasIncomingKeyword =
    /\b(?:You\s+have\s+received|Money\s+Received|Cash\s*In|Payment\s+Received|Received\s*(?:Tk\.?|BDT)|Amount\s*[:\-]?\s*(?:Tk\.?|BDT)\s*[\d,.]+.*?(?:from|sender|A\/C)|জমা\s*হয়েছে|পেয়েছেন)\b/i.test(
      normalizedText,
    );
  if (!hasIncomingKeyword) {
    return null;
  }

  const detectedGw = originatingSender ? detectGatewayFromSender(originatingSender) : null;

  // Common extractors across bKash, Nagad, Rocket, Upay (prioritize amount immediately following received/Cash In/Amount)
  const amountMatch =
    normalizedText.match(
      /(?:You\s+have\s+received|Money\s+Received|Cash\s*In|Payment\s+Received|Received|Amount)\s*(?:of\s*)?(?:Tk\.?|BDT)?\s*[:\-]?\s*([\d,]+\.?\d*)/i,
    ) || normalizedText.match(/(?:Tk\.?|BDT)\s*([\d,]+\.?\d*)/i);

  // Only extract sender number when preceded by from/by/sender/A/C or not preceded by "to"
  const senderMatch =
    normalizedText.match(/(?:from|by|sender|A\/C|account)\s*[:\-]?\s*(\+?8801[3-9]\d{8,9}|01[3-9]\d{8,9})/i) ||
    normalizedText.match(/(?<!\bto\s+)(\+?8801[3-9]\d{8,9}|01[3-9]\d{8,9})\b/i);

  const trxMatch = normalizedText.match(
    /\b(?:TrxID|TxnID|Trans\.?\s*ID|Transaction\s*ID|TxID)\s*[:\-]?\s*([A-Za-z0-9]{5,24})\b/i,
  );

  const balanceMatch = normalizedText.match(/Balance\s*(?:Tk\.?|BDT)?\s*[:\-]?\s*([\d,]+\.?\d*)/i);

  const refMatch = normalizedText.match(/Ref(?:erence)?\s*[:\-]?\s*([A-Za-z0-9\-_]{2,32})/i);

  // Determine gateway from sender or SMS content keywords
  let gateway: 'bkash' | 'nagad' | 'rocket' | 'upay' | null = detectedGw;
  if (!gateway) {
    if (/bkash|16216/i.test(normalizedText)) gateway = 'bkash';
    else if (/nagad|16167|TxnID/i.test(normalizedText) && /Cash In|Send Money|Payment|Received/i.test(normalizedText)) gateway = 'nagad';
    else if (/rocket|16221|dbbl/i.test(normalizedText)) gateway = 'rocket';
    else if (/upay|16268/i.test(normalizedText)) gateway = 'upay';
    else if (/received Tk/i.test(normalizedText) && /TrxID/i.test(normalizedText)) gateway = 'bkash';
  }

  if (gateway && amountMatch && trxMatch) {
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    const trxId = trxMatch[1].trim().toUpperCase();
    const senderNumber = senderMatch ? normalizeBdPhone(senderMatch[1]) : null;
    const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : null;
    const reference =
      refMatch && !/^(fee|balance|trxid|txnid|at|tk)$/i.test(refMatch[1].trim())
        ? refMatch[1].trim()
        : null;

    if (!isNaN(amount) && amount > 0 && trxId) {
      return {
        gateway,
        senderAddress: originatingSender || gateway.toUpperCase(),
        senderNumber,
        amount,
        balance: balance !== null && !isNaN(balance) ? balance : null,
        trxId,
        reference,
        rawSms: rawSms.trim(),
      };
    }
  }

  return null;
}

/**
 * Normalizes Bangladeshi phone numbers into standard 11-digit format: 017XXXXXXXX.
 * Also handles Rocket 12-digit numbers (017XXXXXXXXX -> 017XXXXXXXX) so sender matching works seamlessly.
 */
export function normalizeBdPhone(phone: string): string {
  const normalized = normalizeBanglaDigits(phone || '');
  let digits = normalized.replace(/\D/g, '');
  if (digits.startsWith('00880')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('880') && digits.length >= 13) {
    digits = digits.substring(2);
  }
  // Rocket account numbers are 11-digit mobile + 1 check digit (12 digits starting with 01)
  if (digits.length === 12 && /^01[3-9]/.test(digits)) {
    return digits.slice(0, 11);
  }
  if (digits.length === 11 && digits.startsWith('01')) {
    return digits;
  }
  return digits;
}
