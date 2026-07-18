// Utility functions for ShoppIQ

/**
 * Format amount in Indian number system: ₹1,25,000
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format amount without currency symbol
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount);
}

/**
 * Format date as DD/MM/YYYY
 */
export function formatDate(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format date as "11 Jun 2026"
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format phone number: +91 98765 43210
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Generate invoice number: INV-2026-0001
 */
export function generateInvoiceNumber(count: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count).padStart(4, '0')}`;
}

/**
 * Calculate GST amounts
 */
export function calculateGST(amount: number, gstRate: number) {
  const cgst = (amount * gstRate) / 200; // Half of GST rate for CGST
  const sgst = (amount * gstRate) / 200; // Half of GST rate for SGST
  return { cgst, sgst, total: cgst + sgst };
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Get days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((date2.getTime() - date1.getTime()) / msPerDay);
}

/**
 * Get relative time string (e.g., "2 din pehle")
 */
export function getRelativeTime(date: Date, lang: 'hi' | 'en' = 'en'): string {
  const days = daysBetween(date, new Date());
  if (days === 0) return lang === 'hi' ? 'Aaj' : 'Today';
  if (days === 1) return lang === 'hi' ? 'Kal' : 'Yesterday';
  if (days < 7) return lang === 'hi' ? `${days} din pehle` : `${days} days ago`;
  if (days < 30) return lang === 'hi' ? `${Math.floor(days / 7)} hafte pehle` : `${Math.floor(days / 7)} weeks ago`;
  return formatDate(date);
}

/**
 * Validate Indian GSTIN format
 */
export function validateGSTIN(gstin: string): boolean {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin.toUpperCase());
}

/**
 * Validate Indian mobile number
 */
export function validateMobile(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return /^[6-9][0-9]{9}$/.test(cleaned);
}

/**
 * cn utility for merging class names
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * WhatsApp deep link
 */
export function whatsappLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned.startsWith('91') ? cleaned : '91' + cleaned}?text=${encoded}`;
}
