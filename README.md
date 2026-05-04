You can place this `README.md` in the root of your GitHub repository. It includes all the necessary information for users to understand, install, and use the KMS project.

```markdown
# Simple KMS - Node.js + PostgreSQL

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey)](https://expressjs.com/)

**A robust, production-ready Key Management System (KMS) built with Node.js and PostgreSQL.**  
Supports multiple cryptographic algorithms, key expiration, revocation, rotation, audit logging, and rate limiting.

##  Features

-  **Multiple Algorithms** – RSA (2048/4096), EC (secp256k1), Ed25519  
-  **Key Expiration** – Set `expires_at`; expired keys cannot be used  
-  **Revocation** – Mark keys as revoked with a reason  
-  **Key Rotation** – Generate new versions while optionally keeping old keys active  
-  **Complete Audit Log** – Every action (create, sign, rotate, revoke) is logged  
-  **API Key Authentication** – Clients authenticate with a hashed API key  
-  **Encrypted Private Keys** – AES-256-GCM encryption using a master key derived from a password (PBKDF2)  
-  **Rate Limiting** – Configurable limits per endpoint (prevents abuse)  
-  **PostgreSQL Storage** – Reliable, ACID-compliant database  
-  **Docker Compose** – Easy PostgreSQL setup  
-  **Ready for Production** – Helmet, CORS, Morgan logging, environment-based configuration

##  Prerequisites

- Node.js **18+** (recommended LTS)
- npm (comes with Node.js)
- Docker & Docker Compose (optional, for PostgreSQL container)
- PostgreSQL 15+ (if not using Docker)

##  Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/kms.git
cd kms
```

### 2. Set up environment variables

Copy the example environment file and edit the required values:

```bash
cp .env.example .env
```

Edit `.env` and **change** the `MASTER_PASSWORD` and `MASTER_SALT` to strong, unique values.


##  API Documentation

All endpoints (except `/health` and `/clients`) require the header:

```
X-API-Key: your_api_key_here
```

### Public Endpoints

| Method | Endpoint     | Description                   |
|--------|--------------|-------------------------------|
| GET    | `/health`    | Health check                  |
| POST   | `/clients`   | Create a new client (returns API key) |

#### `POST /clients`

**Request body:**
```json
{
  "name": "My App",
  "permissions": "generate,sign,read,rotate,audit"
}
```

**Response:**
```json
{
  "api_key": "7X9k... (base64url)"
}
```

> Save the returned `api_key` – it will not be shown again.

### Protected Endpoints (require `X-API-Key` header)

#### 🔹 `POST /keys` – Generate a new key

```bash
curl -X POST http://localhost:8000/keys \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm": "RSA_4096",
    "purpose": "signing",
    "expires_in_days": 30,
    "metadata": {"env": "production"}
  }'
```

**Supported algorithms:**  
`EC_SECP256K1`, `RSA_2048`, `RSA_4096`, `Ed25519`

**Response:**
```json
{
  "key_id": "abc123...",
  "algorithm": "RSA_4096",
  "public_key_hex": "3082...",
  "created_at": "2025-01-15T10:00:00.000Z",
  "expires_at": "2025-02-14T10:00:00.000Z"
}
```

#### 🔹 `POST /sign` – Sign a hash

```bash
curl -X POST http://localhost:8000/sign \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "key_id": "abc123...",
    "hash_hex": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }'
```

**Response:**
```json
{
  "signature_hex": "3045022100..."
}
```

#### 🔹 `POST /rotate` – Rotate a key (create a new version)

```bash
curl -X POST http://localhost:8000/rotate \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "old_key_id": "abc123...",
    "keep_old_active": false
  }'
```

**Response:**
```json
{
  "new_key_id": "def456...",
  "version": 2,
  "public_key_hex": "3082..."
}
```

#### 🔹 `POST /revoke` – Revoke a compromised key

```bash
curl -X POST http://localhost:8000/revoke \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "key_id": "abc123...",
    "reason": "private key leaked"
  }'
```

**Response:**
```json
{
  "status": "revoked",
  "key_id": "abc123..."
}
```

#### 🔹 `GET /keys` – List all keys (for the client)

```bash
curl -X GET "http://localhost:8000/keys?include_inactive=true" \
  -H "X-API-Key: <api_key>"
```

**Response:**
```json
{
  "keys": [
    {
      "key_id": "abc123...",
      "algorithm": "RSA_4096",
      "purpose": "signing",
      "created_at": "...",
      "expires_at": "...",
      "revoked": false,
      "is_active": true
    }
  ]
}
```

#### 🔹 `GET /audit` – View audit logs

```bash
curl -X GET "http://localhost:8000/audit?limit=50" \
  -H "X-API-Key: <api_key>"
```

**Response:**
```json
{
  "audit_logs": [
    {
      "timestamp": "2025-01-15T10:00:01.000Z",
      "action": "generate_key",
      "key_id": "abc123...",
      "success": true,
      "details": "alg=RSA_4096"
    }
  ]
}
```

##  Environment Variables

| Variable                     | Description                                           | Default                        |
|------------------------------|-------------------------------------------------------|--------------------------------|
| `NODE_ENV`                   | `development` or `production`                        | `development`                  |
| `PORT`                       | Server port                                           | `8000`                         |
| `DATABASE_URL`               | PostgreSQL connection string                         | (required)                     |
| `MASTER_PASSWORD`            | Password used to derive the master encryption key    | **must be changed**            |
| `MASTER_SALT`                | Salt for PBKDF2                                      | **must be changed**            |
| `RATE_LIMIT_WINDOW_MS`       | Time window for rate limiting (ms)                  | `60000`                        |
| `RATE_LIMIT_MAX_REQUESTS`    | Max requests per window per IP                       | `100`                          |

> **IMPORTANT:** Always override `MASTER_PASSWORD` and `MASTER_SALT` in production. The master key is derived from these values and is **never stored**. Losing them will make all encrypted private keys unrecoverable.

##  Security Highlights

- **API keys** are stored as SHA‑256 hashes (plaintext never saved).
- **Private keys** are encrypted with AES‑256‑GCM using a master key derived via PBKDF2.
- **Rate limiting** prevents brute‑force attacks.
- **Audit logs** record all sensitive operations.
- **Helmet** secures HTTP headers.
- **CORS** is configurable (default allows all, adjust as needed).
- **Expired/revoked keys** are automatically rejected for signing.

##  Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Please ensure your code passes existing tests and includes appropriate tests for new functionality.

##  License

Distributed under the MIT License. See `LICENSE` file for more information.

##  Acknowledgments

- [Node.js](https://nodejs.org/) – JavaScript runtime
- [Express](https://expressjs.com/) – Web framework
- [Sequelize](https://sequelize.org/) – ORM for PostgreSQL
- [crypto](https://nodejs.org/api/crypto.html) – Built‑in cryptography module
- [Docker](https://www.docker.com/) – Containerization

---

Made with ❤️ by Me(https://github.com/aca9710) – open source and free for everyone.
```
