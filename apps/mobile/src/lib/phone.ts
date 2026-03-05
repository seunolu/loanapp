const NON_DIGIT_PLUS_REGEX = /[^\d+]/g;
const NON_DIGIT_REGEX = /\D/g;
const NIGERIA_COUNTRY_CODE = '234';

function compactPhone(input: string): string {
  return input.trim().replace(NON_DIGIT_PLUS_REGEX, '');
}

function digitsOnly(input: string): string {
  return input.replace(NON_DIGIT_REGEX, '');
}

function normalizeInternationalPrefix(input: string): string {
  if (input.startsWith('00')) {
    return `+${input.slice(2)}`;
  }
  return input;
}

function normalizeNigeriaNationalNumber(rawDigits: string): string {
  if (!rawDigits) {
    return '';
  }

  if (rawDigits.startsWith(NIGERIA_COUNTRY_CODE)) {
    const localFromCountryCode = rawDigits.slice(NIGERIA_COUNTRY_CODE.length);
    return localFromCountryCode.startsWith('0') ? localFromCountryCode.slice(1) : localFromCountryCode;
  }

  if (rawDigits.startsWith('0')) {
    return rawDigits.slice(1);
  }

  return rawDigits;
}

export function normalizePhoneE164(input: string): string {
  const compact = normalizeInternationalPrefix(compactPhone(input));
  if (!compact) {
    return '';
  }

  if (compact.startsWith('+')) {
    const normalized = `+${digitsOnly(compact.slice(1))}`;
    if (normalized.startsWith(`+${NIGERIA_COUNTRY_CODE}`)) {
      const local = normalizeNigeriaNationalNumber(normalized.slice(1));
      return local ? `+${NIGERIA_COUNTRY_CODE}${local}` : `+${NIGERIA_COUNTRY_CODE}`;
    }
    return normalized;
  }

  const normalizedLocal = normalizeNigeriaNationalNumber(digitsOnly(compact));
  return normalizedLocal ? `+${NIGERIA_COUNTRY_CODE}${normalizedLocal}` : '';
}

export function toNigeriaLocalPhoneInput(input: string): string {
  const compact = compactPhone(input);
  if (!compact) {
    return '';
  }

  if (compact.startsWith('+')) {
    const normalized = normalizePhoneE164(compact);
    if (normalized.startsWith(`+${NIGERIA_COUNTRY_CODE}`)) {
      return normalized.slice(NIGERIA_COUNTRY_CODE.length + 1).slice(0, 10);
    }
    return digitsOnly(compact).slice(0, 10);
  }

  const normalizedLocal = normalizeNigeriaNationalNumber(digitsOnly(compact));
  return normalizedLocal.slice(0, 10);
}

