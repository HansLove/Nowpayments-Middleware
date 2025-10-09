import * as OTPAuth from 'otpauth';

/**
 * Generates a TOTP (Time-based One-Time Password) code
 * @param secretKey - The base32 encoded secret key for 2FA
 * @returns A 6-digit TOTP code
 */
export function generateTOTPCode(secretKey: string): string {
  const totp = new OTPAuth.TOTP({
    secret: secretKey,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  return totp.generate();
}
