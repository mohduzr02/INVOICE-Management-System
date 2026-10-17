import { INDIAN_STATES } from '../types';

export interface GstinValidationResult {
  isValid: boolean;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  error?: string;
}

export function validateGSTIN(gstin: string): GstinValidationResult {
  if (!gstin) {
    return { isValid: false, error: 'GSTIN cannot be empty' };
  }

  const cleaned = gstin.trim().toUpperCase();

  if (cleaned.length !== 15) {
    return { isValid: false, error: 'GSTIN must be exactly 15 characters long' };
  }

  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid GSTIN format (e.g. 27AABCA1234F1Z8)',
    };
  }

  const stateCode = cleaned.substring(0, 2);
  const pan = cleaned.substring(2, 12);
  const stateObj = INDIAN_STATES.find((s) => s.code === stateCode);

  return {
    isValid: true,
    stateCode,
    stateName: stateObj ? stateObj.name : 'Unknown State',
    pan,
  };
}
