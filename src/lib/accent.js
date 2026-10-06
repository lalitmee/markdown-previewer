export const ACCENT_PRESETS = [
  '#1a73e8', // blue (default)
  '#188038', // green
  '#f9ab00', // amber
  '#d93025', // red
  '#9334e6', // purple
  '#0d9084', // teal
];

// Pick black or white text that stays readable on the chosen accent,
// using the YIQ-style luma heuristic (white below 128, black above).
export function contrastForeground(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 128 ? '#000000' : '#ffffff';
}