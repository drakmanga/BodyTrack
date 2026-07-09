// Values are always stored/transmitted in metric (kg, cm). These helpers only
// affect display, per the "unit_system is presentation-only" backend contract.

export function convertForDisplay(value, unit, unitSystem) {
  if (value === null || value === undefined || unitSystem !== 'IMPERIAL') {
    return { value, unit };
  }
  if (unit === 'kg') {
    return { value: value * 2.20462, unit: 'lb' };
  }
  if (unit === 'cm') {
    return { value: value / 2.54, unit: 'in' };
  }
  return { value, unit };
}

export function formatMeasurement(value, unit, unitSystem) {
  if (value === null || value === undefined) return '—';
  const converted = convertForDisplay(value, unit, unitSystem);
  const decimals = converted.unit === 'lb' || converted.unit === 'in' ? 1 : 1;
  return `${converted.value.toFixed(decimals)} ${converted.unit}`;
}
