/**
 * shortId — Generate unique 6-character user IDs (3 letters + 3 digits).
 *
 * Format: ABC123 — used like phone numbers to find and connect with users.
 * Total combinations: 26³ × 10³ = 17,576,000 (more than enough for 25 users).
 */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';

/**
 * Generate a random short ID in the format AAA000 (3 uppercase letters + 3 digits).
 */
export function generateShortId(): string {
  let id = '';
  for (let i = 0; i < 3; i++) {
    id += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  for (let i = 0; i < 3; i++) {
    id += DIGITS[Math.floor(Math.random() * DIGITS.length)];
  }
  return id;
}

/**
 * Validate that a string is a valid short ID format (3 letters + 3 digits).
 */
export function isValidShortId(id: string): boolean {
  return /^[A-Z]{3}[0-9]{3}$/.test(id);
}

/**
 * Format a short ID for display with a separator: ABC-123
 */
export function formatShortId(id: string): string {
  if (!isValidShortId(id)) return id;
  return `${id.slice(0, 3)}-${id.slice(3)}`;
}
