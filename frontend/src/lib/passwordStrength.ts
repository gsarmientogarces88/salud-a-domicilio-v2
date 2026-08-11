export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export type PasswordStrength = {
  score: PasswordStrengthLevel;
  label: 'Débil' | 'Media' | 'Fuerte' | '';
  /** Color de la etiqueta / segmentos activos */
  tone: 'gray' | 'red' | 'orange' | 'green';
};

/** Evalúa fortaleza en escala 0–4 (4 segmentos visuales). */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: '', tone: 'gray' };
  }

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const clamped = Math.min(4, score) as PasswordStrengthLevel;

  if (clamped <= 1) return { score: clamped || 1, label: 'Débil', tone: 'red' };
  if (clamped === 2) return { score: 2, label: 'Media', tone: 'orange' };
  return { score: clamped, label: 'Fuerte', tone: 'green' };
}
