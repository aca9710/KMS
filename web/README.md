# KMS Web - Interfaz de Administración

Panel de administración gráfico para el sistema de gestión de claves criptográficas.

---

## Características

- **Login Seguro** - Autenticación mediante API Key
- **Dashboard** - Estadísticas en tiempo real de claves (total, activas, expiradas, revocadas)
- **Gestión de Claves** - Crear, ver detalles, rotar y revocar claves criptográficas
- **Firmado de Datos** - Interfaz gráfica para firmar hashes con claves privadas
- **Auditoría** - Visor de logs de todas las operaciones
- **Diseño Responsivo** - Funciona en escritorio y dispositivos móviles

---

## Prerrequisitos

- Node.js **18+**
- npm
- API REST del KMS funcionando (por defecto en `http://localhost:8000`)

---

## Instalación

```bash
cd web
npm install
```

### Configuración

Crea un archivo `.env` basado en `.env.example`:

```env
PORT=3000
API_BASE=http://localhost:8000/api
```

---

## Uso

### Iniciar el servidor

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

La aplicación estará disponible en `http://localhost:3000`

---

## Primeros Pasos

### 1. Obtener una API Key

Si no tienes una cuenta, puedes crear un cliente desde la interfaz web:

1. En la pantalla de login, haz clic en **"Crear cliente"**
2. Ingresa el nombre de tu aplicación
3. Selecciona los permisos necesarios:
   - `generate` - Generar claves
   - `sign` - Firmar datos
   - `read` - Leer claves
   - `rotate` - Rotar claves
   - `audit` - Ver auditoría
4. Clic en **"Crear Cliente"**
5. **Importante:** Guarda la API Key mostrada - solo se muestra una vez

### 2. Iniciar Sesión

Ingresa tu API Key en la pantalla de login y conecta.

---

## Funcionalidades

### Dashboard

Muestra una visión general del estado de tus claves:
- Total de claves
- Claves activas
- Claves expiradas
- Claves revocadas
- Claves recientes
- Actividad reciente

### Gestión de Claves

Desde la pestaña **Claves** puedes:

- **Crear nueva clave**: Selecciona algoritmo (RSA 2048, RSA 4096, EC secp256k1, Ed25519), propósito y fecha de expiración
- **Ver detalles**: Ver información completa de cada clave
- **Rotar**: Crear una nueva versión de la clave
- **Revocar**: Invalidar una clave comprometida

### Firmar Datos

En la pestaña **Firmar**:
1. Selecciona una clave activa
2. Ingresa el hash a firmar (formato hexadecimal, 64 caracteres para SHA-256)
3. Obtén la firma generada

### Auditoría

En la pestaña **Auditoría** puedes ver el historial de todas las operaciones:
- Generar clave
- Firmar datos
- Rotar clave
- Revocar clave

---

## Tecnologías

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Express.js
- **Comunicación**: REST API con fetch

---

## Notas

- La API Key se almacena en `localStorage` del navegador
- La aplicación se conecta a la API REST en `http://localhost:8000/api` por defecto
- Si la API está en otro puerto, ajusta la variable `API_BASE` en `.env`

---

## Licencia

MIT License - ver archivo [LICENSE](../LICENSE) en el raíz del proyecto