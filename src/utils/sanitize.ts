/** Strip HTML tags and trim whitespace to prevent XSS via user input */
export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

/** Sanitize and limit length */
export function sanitizeField(input: string, maxLength = 255): string {
  return sanitizeText(input).slice(0, maxLength);
}

/** Validate Philippine mobile number */
export function isValidPHPhone(phone: string): boolean {
  return /^(09|\+639)\d{9}$/.test(phone.trim());
}

/** Validate email */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
