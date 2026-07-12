/** Philippine mobile — digits only, max 11 (e.g. 09171234567). */
export function sanitizePhoneInput(value, maxDigits = 11) {
  return String(value || '').replace(/\D/g, '').slice(0, maxDigits);
}

export function isValidPhPhone(value) {
  return /^09\d{9}$/.test(sanitizePhoneInput(value));
}
