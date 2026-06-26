/* eslint-disable prettier/prettier */
// Strips everything except letters and spaces (for names)
export const nameOnly = (v: string) => v.replace(/[^a-zA-Z\s'-]/g, "");

// Strips everything except digits (for NIN, phone)
export const digitsOnly = (v: string) => v.replace(/\D/g, "");

// Strips everything except digits, +, spaces, dashes (for phone with country code)
export const phoneOnly = (v: string) => v.replace(/[^0-9+\s-]/g, "");

// Allows letters, digits, spaces, basic punctuation (for business names, addresses, item descriptions)
export const safeText = (v: string) => v.replace(/[<>'"`;\\]/g, "");

// Validates email format
export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Validates Nigerian phone (07x, 08x, 09x — 11 digits)
export const isValidPhone = (v: string) => /^(0[7-9][0-1]\d{8})$/.test(v.replace(/\s/g, ""));

// Validates NIN (exactly 11 digits)
export const isValidNIN = (v: string) => /^\d{11}$/.test(v);

// Max length guard
export const maxLen = (v: string, n: number) => v.slice(0, n);
