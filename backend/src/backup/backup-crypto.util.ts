import * as crypto from 'crypto';

export const BACKUP_MAGIC = Buffer.from('FCMDBAK1', 'ascii');
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * Derive a 256-bit AES key from passphrase + random salt via scrypt.
 */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.scryptSync(passphrase, salt, 32, { N: 16384, r: 8, p: 1 });
}

/**
 * Encrypt a raw archive buffer using AES-256-GCM.
 * Wire layout: [8B magic "FCMDBAK1"][16B salt][12B iv][16B authTag][ciphertext]
 */
export function encryptBufferAes256Gcm(plainBuffer: Buffer, passphrase: string): Buffer {
  if (!passphrase || passphrase.trim().length < 8) {
    throw new Error('BACKUP_ENCRYPTION_KEY trebuie să aibă cel puțin 8 caractere.');
  }

  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(passphrase.trim(), salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([BACKUP_MAGIC, salt, iv, authTag, ciphertext]);
}

/**
 * Decrypt a `.fleetbak` buffer produced by encryptBufferAes256Gcm.
 */
export function decryptBufferAes256Gcm(encryptedBuffer: Buffer, passphrase: string): Buffer {
  const minLen = BACKUP_MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN + 1;
  if (encryptedBuffer.length < minLen) {
    throw new Error('Fișier backup invalid sau trunchiat.');
  }

  const magic = encryptedBuffer.subarray(0, BACKUP_MAGIC.length);
  if (!magic.equals(BACKUP_MAGIC)) {
    throw new Error('Format de backup nerecunoscut (header invalid).');
  }

  let offset = BACKUP_MAGIC.length;
  const salt = encryptedBuffer.subarray(offset, offset + SALT_LEN);
  offset += SALT_LEN;
  const iv = encryptedBuffer.subarray(offset, offset + IV_LEN);
  offset += IV_LEN;
  const authTag = encryptedBuffer.subarray(offset, offset + TAG_LEN);
  offset += TAG_LEN;
  const ciphertext = encryptedBuffer.subarray(offset);

  const key = deriveKey(passphrase.trim(), salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function computeSha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}
