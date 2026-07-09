// Number inputs on Italian mobile keyboards emit a comma as the decimal separator, which
// native <input type="number"> silently rejects (the invalid keystroke is dropped instead of
// being normalized), corrupting whatever the user meant to type. Fields that use this must be
// type="text" inputMode="decimal" with their onChange wired through this sanitizer instead.
export function sanitizeDecimalInput(raw) {
  const normalized = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const firstDot = normalized.indexOf('.');
  if (firstDot === -1) return normalized;
  return normalized.slice(0, firstDot + 1) + normalized.slice(firstDot + 1).replace(/\./g, '');
}
