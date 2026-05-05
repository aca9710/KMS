# KMS - Key Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)

**Sistema de Gestión de Claves Criptográficas** compuesto por una API REST y una interfaz web de administración.

---

## Estructura del Proyecto

```
kms/
├── api-rest/          # API REST (Node.js + Express + PostgreSQL)
├── web/               # Interfaz web de administración
└── README.md          # Este archivo
```

---

## Componentes

### API REST (`/api-rest`)

Backend RESTful para gestión de claves criptográficas.

**Características:**
- Múltiples algoritmos: RSA (2048/4096), EC (secp256k1), Ed25519
- Expiración de claves
- Revocación con razón
- Rotación de claves (versiones)
- Registro completo de auditoría
- Autenticación por API Key
- Claves privadas cifradas con AES-256-GCM
- Rate limiting

**Documentación completa:** [api-rest/README.md](api-rest/README.md)

---

### Interfaz Web (`/web`)

Panel de administración gráfico para gestionar claves desde el navegador.

**Características:**
- Login seguro con API Key
- Dashboard con estadísticas en tiempo real
- Gestión visual de claves (crear, ver, rotar, revocar)
- Firmado de datos con interfaz gráfica
- Visor de logs de auditoría
- Diseño responsivo y moderno

**Documentación completa:** [web/README.md](web/README.md)

---

## Inicio Rápido

### Prerrequisitos

- Node.js **18+**
- PostgreSQL 15+ (o Docker)
- npm

### 1. Configurar la API REST

```bash
cd api-rest
cp .env.example .env
# Editar .env con MASTER_PASSWORD y MASTER_SALT seguros

# Iniciar PostgreSQL (Docker)
docker-compose up -d

# Instalar dependencias y ejecutar
npm install
npm start
```

La API estará en `http://localhost:8000`

### 2. Configurar la Interfaz Web

```bash
cd web
cp .env.example .env
# Configurar API_BASE si la API está en otro puerto

npm install
npm start
```

La interfaz estará en `http://localhost:3000`

---

## Endpoints Principales

| Método | Endpoint      | Descripción                    |
|--------|---------------|--------------------------------|
| GET    | `/health`    | Health check                  |
| POST   | `/clients`   | Crear cliente (obtener API key) |
| POST   | `/keys`      | Generar nueva clave           |
| POST   | `/sign`      | Firmar hash                   |
| POST   | `/rotate`    | Rotar clave                   |
| POST   | `/revoke`    | Revocar clave                 |
| GET    | `/keys`      | Listar claves                 |
| GET    | `/audit`     | Ver logs de auditoría         |

> Todos los endpoints protegidos requieren el header `X-API-Key`

---

## Variables de Entorno

### API REST

| Variable                    | Descripción                              | Default   |
|-----------------------------|------------------------------------------|-----------|
| `PORT`                      | Puerto del servidor                      | `8000`    |
| `DATABASE_URL`              | Connection string de PostgreSQL         | (requerido) |
| `MASTER_PASSWORD`           | Password para cifrar claves privadas     | **cambiar** |
| `MASTER_SALT`               | Salt para PBKDF2                         | **cambiar** |
| `RATE_LIMIT_WINDOW_MS`     | Ventana de rate limiting (ms)           | `60000`   |
| `RATE_LIMIT_MAX_REQUESTS`  | Máx. requests por ventana                | `100`     |

### Interfaz Web

| Variable    | Descripción                    | Default              |
|-------------|--------------------------------|----------------------|
| `PORT`      | Puerto del servidor           | `3000`               |
| `API_BASE`  | URL de la API REST            | `http://localhost:8000/api` |

---

## Seguridad

- **API keys** almacenadas como hash SHA-256
- **Claves privadas** cifradas con AES-256-GCM usando clave maestra derivada de PBKDF2
- **Rate limiting** previene ataques de fuerza bruta
- **Audit logs** registran todas las operaciones sensibles
- **Helmet** asegura headers HTTP

---

## Licencia

MIT License - ver archivo [LICENSE](LICENSE)

---

Hecho con ❤️ por [aca9710](https://github.com/aca9710)