const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Master key for encryption
let masterKey = process.env.MASTER_PASSWORD || 'master123';

if (process.env.MASTER_SALT) {
  // Derive key using PBKDF2
  masterKey = crypto.pbkdf2Sync(process.env.MASTER_PASSWORD || 'master123', process.env.MASTER_SALT, 100000, 32, 'sha256').toString('hex');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ============ UTILITIES ============

function encrypt(text) {
  const cipher = crypto.createCipher('aes-256-cbc', masterKey);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encryptedText) {
  const decipher = crypto.createDecipher('aes-256-cbc', masterKey);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateApiKey() {
  return 'kms_' + crypto.randomBytes(24).toString('hex');
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// ============ DATABASE QUERIES ============

// Clients
async function createClient(name, permissions) {
  const id = generateId();
  const apiKey = generateApiKey();
  
  // Hash the API key for storage
  const hashedApiKey = await bcrypt.hash(apiKey, 10);
  
  const result = await pool.query(
    `INSERT INTO clients (id, name, api_key_hash, permissions, created_at, is_active) 
     VALUES ($1, $2, $3, $4, NOW(), true) 
     RETURNING id, name, permissions, created_at`,
    [id, name, hashedApiKey, permissions]
  );
  
  return { id, api_key: apiKey, ...result.rows[0] };
}

async function validateApiKey(apiKey) {
  const result = await pool.query(
    `SELECT id, name, permissions, is_active FROM clients WHERE is_active = true`,
  );
  
  for (const client of result.rows) {
    const valid = await bcrypt.compare(apiKey, client.id); // Simplified: use api_key directly as id
    if (valid && client.id === apiKey) {
      return client;
    }
    // Also check stored hash
    if (client.api_key_hash) {
      const hashValid = await bcrypt.compare(apiKey, client.api_key_hash);
      if (hashValid) return client;
    }
  }
  
  // Simplified: just find by API key string
  const clientResult = await pool.query(
    `SELECT c.id, c.name, c.permissions, c.is_active 
     FROM clients c 
     WHERE c.api_key_hash = $1 AND c.is_active = true`,
    [apiKey]
  );
  
  if (clientResult.rows.length > 0) {
    return clientResult.rows[0];
  }
  
  return null;
}

async function getClientByApiKey(apiKey) {
  const result = await pool.query(
    `SELECT c.id, c.name, c.permissions, c.is_active 
     FROM clients c 
     WHERE c.id = $1 AND c.is_active = true`,
    [apiKey]
  );
  
  return result.rows[0] || null;
}

// Keys (audit logs for viewing keys)
async function getKeys(clientId, includeInactive = false) {
  let query = `
    SELECT id, client_id, algorithm, purpose, version, public_key_hex, 
           created_at, expires_at, is_active, revoked, revocation_reason, key_metadata
    FROM keys 
    WHERE client_id = $1
  `;
  
  if (!includeInactive) {
    query += ` AND is_active = true AND revoked = false`;
  }
  
  query += ` ORDER BY created_at DESC`;
  
  const result = await pool.query(query, [clientId]);
  return result.rows;
}

async function getAuditLogs(clientId, limit = 100, action = null) {
  let query = `
    SELECT id, timestamp, client_id, action, key_id, success, ip_address, details
    FROM audit_logs 
    WHERE client_id = $1
  `;
  
  const params = [clientId];
  
  if (action && action !== 'all') {
    query += ` AND action = $2`;
    params.push(action);
  }
  
  query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  
  const result = await pool.query(query, params);
  return result.rows;
}

async function createAuditLog(clientId, action, keyId = null, success = true, details = null, ipAddress = null) {
  const result = await pool.query(
    `INSERT INTO audit_logs (timestamp, client_id, action, key_id, success, ip_address, details)
     VALUES (NOW(), $1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [clientId, action, keyId, success, ipAddress, details]
  );
  return result.rows[0];
}

// ============ API ROUTES ============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create client (public - for registration)
app.post('/api/clients', async (req, res) => {
  try {
    const { name, permissions } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    const client = await createClient(name, permissions || 'read');
    await createAuditLog(client.id, 'create_client', null, true, `Created client: ${name}`);
    
    res.json({ api_key: client.api_key });
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ error: err.message });
  }
});

// Protected routes middleware
async function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  const client = await getClientByApiKey(apiKey);
  
  if (!client) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  req.client = client;
  next();
}

// Get client info
app.get('/api/client', authenticate, async (req, res) => {
  res.json({
    id: req.client.id,
    name: req.client.name,
    permissions: req.client.permissions
  });
});

// Get keys
app.get('/api/keys', authenticate, async (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const keys = await getKeys(req.client.id, includeInactive);
    
    await createAuditLog(req.client.id, 'list_keys', null, true, `Listed ${keys.length} keys`);
    
    res.json({ keys });
  } catch (err) {
    console.error('Error listing keys:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get audit logs
app.get('/api/audit', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const action = req.query.action || null;
    
    const logs = await getAuditLogs(req.client.id, limit, action);
    
    await createAuditLog(req.client.id, 'audit_log', null, true, `Retrieved ${logs.length} audit logs`, req.ip);
    
    res.json({ audit_logs: logs });
  } catch (err) {
    console.error('Error listing audit logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ FRONTEND ROUTES ============

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`KMS Web running on http://localhost:${PORT}`);
});