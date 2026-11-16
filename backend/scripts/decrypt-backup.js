#!/usr/bin/env node
/**
 * Decrypt a FleetCMD `.fleetbak` archive back into a standard `.zip` file.
 * Usage:
 *   node backend/scripts/decrypt-backup.js <input.fleetbak> [output.zip] [passphrase]
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BACKUP_MAGIC = Buffer.from('FCMDBAK1', 'ascii');
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

function loadEnvPassphrase() {
  if (process.env.BACKUP_ENCRYPTION_KEY && process.env.BACKUP_ENCRYPTION_KEY.trim()) {
    return process.env.BACKUP_ENCRYPTION_KEY.trim();
  }
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend', '.env'),
    path.resolve(__dirname, '..', '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*BACKUP_ENCRYPTION_KEY\s*=\s*(.+?)\s*$/);
      if (m && m[1]) {
        return m[1].replace(/^["']|["']$/g, '').trim();
      }
    }
  }
  return '';
}

function decryptBuffer(encryptedBuffer, passphrase) {
  const minLen = BACKUP_MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN + 1;
  if (encryptedBuffer.length < minLen) {
    throw new Error('Fișier backup invalid sau prea scurt.');
  }
  const magic = encryptedBuffer.subarray(0, BACKUP_MAGIC.length);
  if (!magic.equals(BACKUP_MAGIC)) {
    throw new Error('Header invalid: acest fișier nu este o arhivă .fleetbak.');
  }

  let offset = BACKUP_MAGIC.length;
  const salt = encryptedBuffer.subarray(offset, offset + SALT_LEN);
  offset += SALT_LEN;
  const iv = encryptedBuffer.subarray(offset, offset + IV_LEN);
  offset += IV_LEN;
  const authTag = encryptedBuffer.subarray(offset, offset + TAG_LEN);
  offset += TAG_LEN;
  const ciphertext = encryptedBuffer.subarray(offset);

  const key = crypto.scryptSync(passphrase.trim(), salt, 32, { N: 16384, r: 8, p: 1 });
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error('Utilizare: node backend/scripts/decrypt-backup.js <fisier.fleetbak> [iesire.zip] [cheie]');
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  if (!fs.existsSync(inputPath)) {
    console.error(`Fișierul nu există: ${inputPath}`);
    process.exit(1);
  }

  const outputPath = process.argv[3]
    ? path.resolve(process.argv[3])
    : inputPath.replace(/\.fleetbak$/i, '') + '.zip';

  const passphrase = process.argv[4] || loadEnvPassphrase();
  if (!passphrase) {
    console.error('Lipsește cheia! Transmite cheia ca al 3-lea argument sau setează BACKUP_ENCRYPTION_KEY în .env.');
    process.exit(1);
  }

  const encrypted = fs.readFileSync(inputPath);
  const shaIn = crypto.createHash('sha256').update(encrypted).digest('hex');
  const plainZip = decryptBuffer(encrypted, passphrase);
  fs.writeFileSync(outputPath, plainZip);
  const shaOut = crypto.createHash('sha256').update(plainZip).digest('hex');

  console.log(`✅ Decriptare reușită!`);
  console.log(`   Intrare : ${inputPath} (SHA-256: ${shaIn})`);
  console.log(`   Ieșire  : ${outputPath} (${(plainZip.length / 1024).toFixed(1)} KB, SHA-256: ${shaOut})`);
}

main();
