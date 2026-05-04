const crypto = require('crypto');
const { Client, Key, AuditLog } = require('../models');
const { encryptWithMaster, decryptWithMaster, generateRSAKey, generateECKey, generateEd25519Key, signRSA, signEC, signEd25519 } = require('../utils/crypto');

class KMSService {
  constructor() {}

  async createClient(name, permissions) {
    const apiKey = crypto.randomBytes(32).toString('base64url');
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    const client = await Client.create({
      id: hashedKey,
      name,
      permissions
    });
    await this.logAudit(hashedKey, 'create_client', null, true, null, `Name: ${name}`);
    return apiKey;
  }

  async generateKey(apiKey, algorithm, purpose, expiresInDays = null, metadata = null) {
    const client = await this.authenticateClient(apiKey, 'generate');
    let privateKey, publicKey;
    switch (algorithm) {
      case 'RSA_2048':
        ({ privateKey, publicKey } = generateRSAKey(2048));
        break;
      case 'RSA_4096':
        ({ privateKey, publicKey } = generateRSAKey(4096));
        break;
      case 'EC_SECP256K1':
        ({ privateKey, publicKey } = generateECKey());
        break;
      case 'Ed25519':
        ({ privateKey, publicKey } = generateEd25519Key());
        break;
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
    const encryptedPrivate = encryptWithMaster(privateKey);
    const keyId = crypto.randomBytes(16).toString('base64url');
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }
    const newKey = await Key.create({
      id: keyId,
      client_id: client.id,
      algorithm,
      purpose,
      version: 1,
      encrypted_private_key: encryptedPrivate,
      public_key_hex: publicKey.toString('hex'),
      expires_at: expiresAt,
      key_metadata: metadata ? JSON.stringify(metadata) : null
    });
    await this.logAudit(client.id, 'generate_key', keyId, true, null, `alg=${algorithm}`);
    return {
      key_id: keyId,
      algorithm,
      public_key_hex: publicKey.toString('hex'),
      created_at: newKey.created_at.toISOString(),
      expires_at: expiresAt ? expiresAt.toISOString() : null
    };
  }

  async sign(apiKey, keyId, hashHex, ip = '') {
    const client = await this.authenticateClient(apiKey, 'sign');
    const key = await Key.findOne({
      where: {
        id: keyId,
        client_id: client.id,
        is_active: true,
        revoked: false
      }
    });
    if (!key) {
      await this.logAudit(client.id, 'sign', keyId, false, ip, 'Key not found, inactive or revoked');
      return null;
    }
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      await this.logAudit(client.id, 'sign', keyId, false, ip, 'Key expired');
      return null;
    }
    const privateKeyDer = decryptWithMaster(key.encrypted_private_key);
    let signature;
    try {
      if (key.algorithm.startsWith('RSA')) {
        signature = signRSA(privateKeyDer, hashHex);
      } else if (key.algorithm === 'EC_SECP256K1') {
        signature = signEC(privateKeyDer, hashHex);
      } else if (key.algorithm === 'Ed25519') {
        signature = signEd25519(privateKeyDer, hashHex);
      } else {
        throw new Error('Unsupported algorithm');
      }
    } catch (err) {
      await this.logAudit(client.id, 'sign', keyId, false, ip, err.message);
      return null;
    }
    await this.logAudit(client.id, 'sign', keyId, true, ip);
    return signature.toString('hex');
  }

  async rotateKey(apiKey, oldKeyId, keepOldActive = false) {
    const client = await this.authenticateClient(apiKey, 'rotate');
    const oldKey = await Key.findOne({ where: { id: oldKeyId, client_id: client.id } });
    if (!oldKey) {
      await this.logAudit(client.id, 'rotate', oldKeyId, false, null, 'Key not found');
      return null;
    }
    let privateKey, publicKey;
    const alg = oldKey.algorithm;
    if (alg === 'RSA_2048') {
      ({ privateKey, publicKey } = generateRSAKey(2048));
    } else if (alg === 'RSA_4096') {
      ({ privateKey, publicKey } = generateRSAKey(4096));
    } else if (alg === 'EC_SECP256K1') {
      ({ privateKey, publicKey } = generateECKey());
    } else if (alg === 'Ed25519') {
      ({ privateKey, publicKey } = generateEd25519Key());
    } else {
      throw new Error(`Unsupported algorithm: ${alg}`);
    }
    const encryptedPrivate = encryptWithMaster(privateKey);
    const newKeyId = crypto.randomBytes(16).toString('base64url');
    const newVersion = oldKey.version + 1;
    const newKey = await Key.create({
      id: newKeyId,
      client_id: client.id,
      algorithm: alg,
      purpose: oldKey.purpose,
      version: newVersion,
      encrypted_private_key: encryptedPrivate,
      public_key_hex: publicKey.toString('hex'),
      expires_at: oldKey.expires_at,
      key_metadata: oldKey.key_metadata
    });
    if (!keepOldActive) {
      oldKey.is_active = false;
      await oldKey.save();
    }
    await this.logAudit(client.id, 'rotate', oldKeyId, true, null, `new_key_id=${newKeyId}`);
    return {
      new_key_id: newKeyId,
      version: newVersion,
      public_key_hex: publicKey.toString('hex')
    };
  }

  async revokeKey(apiKey, keyId, reason) {
    const client = await this.authenticateClient(apiKey, 'rotate');
    const key = await Key.findOne({ where: { id: keyId, client_id: client.id } });
    if (!key) {
      await this.logAudit(client.id, 'revoke', keyId, false, null, 'Key not found');
      return false;
    }
    key.revoked = true;
    key.revocation_reason = reason;
    key.is_active = false;
    await key.save();
    await this.logAudit(client.id, 'revoke', keyId, true, null, reason);
    return true;
  }

  async listKeys(apiKey, includeInactive = false) {
    const client = await this.authenticateClient(apiKey, 'read');
    const where = { client_id: client.id };
    if (!includeInactive) {
      where.is_active = true;
      where.revoked = false;
    }
    const keys = await Key.findAll({ where });
    return keys.map(k => ({
      key_id: k.id,
      algorithm: k.algorithm,
      purpose: k.purpose,
      created_at: k.created_at.toISOString(),
      expires_at: k.expires_at ? k.expires_at.toISOString() : null,
      revoked: k.revoked,
      is_active: k.is_active
    }));
  }

  async getAuditLogs(apiKey, limit = 100) {
    const client = await this.authenticateClient(apiKey, 'audit');
    const logs = await AuditLog.findAll({
      where: { client_id: client.id },
      order: [['timestamp', 'DESC']],
      limit
    });
    return logs.map(l => ({
      timestamp: l.timestamp.toISOString(),
      action: l.action,
      key_id: l.key_id,
      success: l.success,
      details: l.details
    }));
  }

  async authenticateClient(apiKey, requiredPermission) {
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    const client = await Client.findOne({ where: { id: hashedKey, is_active: true } });
    if (!client) throw new Error('Invalid API Key');
    const perms = client.permissions.split(',');
    if (!perms.includes(requiredPermission)) throw new Error(`Missing permission: ${requiredPermission}`);
    return client;
  }

  async logAudit(clientId, action, keyId, success, ip = '', details = '') {
    await AuditLog.create({
      client_id: clientId,
      action,
      key_id: keyId,
      success,
      ip_address: ip,
      details
    });
  }
}

module.exports = KMSService;
