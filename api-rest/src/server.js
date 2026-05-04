require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const sequelize = require('./config/database');
const { initMasterKey } = require('./utils/crypto');
const authMiddleware = require('./middleware/auth');
const createLimiter = require('./middleware/rateLimiter');
const KMSService = require('./services/kmsService');

const app = express();
const PORT = process.env.PORT || 8000;

// Inicializar clave maestra
initMasterKey(process.env.MASTER_PASSWORD, process.env.MASTER_SALT);

// Middlewares globales
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Servicio KMS
const kms = new KMSService();

// Rate limiters por endpoint
const limiterStrict = createLimiter(parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, 10);
const limiterModerate = createLimiter(60000, 30);
const limiterLax = createLimiter(60000, 100);

// Endpoints públicos
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/clients', limiterStrict, async (req, res) => {
  try {
    const { name, permissions } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const apiKey = await kms.createClient(name, permissions || 'generate,sign,read');
    res.json({ api_key: apiKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoints protegidos con API Key
app.use(authMiddleware);

app.post('/keys', limiterModerate, async (req, res) => {
  try {
    const { algorithm, purpose, expires_in_days, metadata } = req.body;
    if (!algorithm) return res.status(400).json({ error: 'algorithm required' });
    const result = await kms.generateKey(req.apiKey, algorithm, purpose || 'signing', expires_in_days, metadata);
    res.json(result);
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

app.post('/sign', limiterLax, async (req, res) => {
  try {
    const { key_id, hash_hex } = req.body;
    if (!key_id || !hash_hex) return res.status(400).json({ error: 'key_id and hash_hex required' });
    const ip = req.ip || req.connection.remoteAddress;
    const signature = await kms.sign(req.apiKey, key_id, hash_hex, ip);
    if (!signature) return res.status(401).json({ error: 'Signing failed' });
    res.json({ signature_hex: signature });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

app.post('/rotate', limiterModerate, async (req, res) => {
  try {
    const { old_key_id, keep_old_active } = req.body;
    if (!old_key_id) return res.status(400).json({ error: 'old_key_id required' });
    const result = await kms.rotateKey(req.apiKey, old_key_id, keep_old_active || false);
    if (!result) return res.status(404).json({ error: 'Key not found or rotation failed' });
    res.json(result);
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

app.post('/revoke', limiterStrict, async (req, res) => {
  try {
    const { key_id, reason } = req.body;
    if (!key_id) return res.status(400).json({ error: 'key_id required' });
    const success = await kms.revokeKey(req.apiKey, key_id, reason || 'no reason');
    if (!success) return res.status(404).json({ error: 'Key not found' });
    res.json({ status: 'revoked', key_id });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

app.get('/keys', limiterModerate, async (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const keys = await kms.listKeys(req.apiKey, includeInactive);
    res.json({ keys });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

app.get('/audit', limiterModerate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await kms.getAuditLogs(req.apiKey, limit);
    res.json({ audit_logs: logs });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// Sincronizar base de datos e iniciar servidor
sequelize.sync({ alter: false })
  .then(() => {
    console.log('✅ Database synchronized');
    app.listen(PORT, () => {
      console.log(`🚀 KMS Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });
