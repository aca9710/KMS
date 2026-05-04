const crypto = require('crypto');

// Clave maestra derivada de MASTER_PASSWORD + MASTER_SALT (se establece al inicio)
let MASTER_KEY = null;

function initMasterKey(password, salt) {
  MASTER_KEY = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return MASTER_KEY;
}

function encryptWithMaster(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

function decryptWithMaster(encrypted) {
  const iv = encrypted.subarray(0, 16);
  const authTag = encrypted.subarray(16, 32);
  const ciphertext = encrypted.subarray(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// Generación de claves asimétricas
function generateRSAKey(bits = 2048) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: bits,
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' }
  });
  return { privateKey, publicKey };
}

function generateECKey() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' }
  });
  return { privateKey, publicKey };
}

function generateEd25519Key() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' }
  });
  return { privateKey, publicKey };
}

// Firmas
function signRSA(privateKeyDer, hashHex) {
  const hash = Buffer.from(hashHex.replace('0x', ''), 'hex');
  const privateKey = crypto.createPrivateKey({ key: privateKeyDer, format: 'der', type: 'pkcs8' });
  return crypto.sign('sha256', hash, privateKey);
}

function signEC(privateKeyDer, hashHex) {
  const hash = Buffer.from(hashHex.replace('0x', ''), 'hex');
  const privateKey = crypto.createPrivateKey({ key: privateKeyDer, format: 'der', type: 'pkcs8' });
  return crypto.sign(null, hash, privateKey); // ECDSA with SHA256
}

function signEd25519(privateKeyDer, hashHex) {
  const hash = Buffer.from(hashHex.replace('0x', ''), 'hex');
  const privateKey = crypto.createPrivateKey({ key: privateKeyDer, format: 'der', type: 'pkcs8' });
  return crypto.sign(null, hash, privateKey);
}

module.exports = {
  initMasterKey,
  encryptWithMaster,
  decryptWithMaster,
  generateRSAKey,
  generateECKey,
  generateEd25519Key,
  signRSA,
  signEC,
  signEd25519
};
