// KMS Web Application - Complete Dashboard
const API_BASE = 'http://localhost:3000/api';

class KMSApp {
    constructor() {
        this.apiKey = localStorage.getItem('kms_api_key');
        this.init();
    }

    init() {
        this.bindEvents();
        if (this.apiKey) {
            this.showDashboard();
            this.loadDashboard();
        } else {
            this.showLogin();
        }
    }

    bindEvents() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // User menu dropdown
        document.getElementById('user-menu-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('user-dropdown').classList.toggle('show');
        });

        document.addEventListener('click', () => {
            document.getElementById('user-dropdown').classList.remove('show');
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Create client modal
        document.getElementById('create-client-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('create-client-modal');
        });

        document.getElementById('close-create-client').addEventListener('click', () => {
            this.hideModal('create-client-modal');
        });

        document.getElementById('cancel-create-client').addEventListener('click', () => {
            this.hideModal('create-client-modal');
        });

        document.querySelector('#create-client-modal .modal-backdrop').addEventListener('click', () => {
            this.hideModal('create-client-modal');
        });

        document.getElementById('create-client-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createClient();
        });

        document.getElementById('copy-api-key').addEventListener('click', () => {
            const key = document.getElementById('new-api-key').textContent;
            navigator.clipboard.writeText(key);
            this.showToast('API Key copiada al portapapeles', 'success');
        });

        document.getElementById('use-api-key').addEventListener('click', () => {
            const key = document.getElementById('new-api-key').textContent;
            this.apiKey = key;
            localStorage.setItem('kms_api_key', key);
            this.hideModal('create-client-modal');
            this.showDashboard();
            this.loadDashboard();
            this.showToast('Conectado exitosamente', 'success');
        });

        // Create key modal
        document.getElementById('create-key-btn').addEventListener('click', () => {
            this.showModal('create-key-modal');
        });

        document.getElementById('close-create-key').addEventListener('click', () => {
            this.hideModal('create-key-modal');
        });

        document.getElementById('cancel-create-key').addEventListener('click', () => {
            this.hideModal('create-key-modal');
        });

        document.querySelector('#create-key-modal .modal-backdrop').addEventListener('click', () => {
            this.hideModal('create-key-modal');
        });

        document.getElementById('create-key-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createKey();
        });

        // Key filter and search
        document.getElementById('key-filter').addEventListener('change', () => {
            this.loadKeys();
        });

        document.getElementById('key-search').addEventListener('input', (e) => {
            this.filterKeys(e.target.value);
        });

        // Key details modal
        document.getElementById('close-key-details').addEventListener('click', () => {
            this.hideModal('key-details-modal');
        });

        document.querySelector('#key-details-modal .modal-backdrop').addEventListener('click', () => {
            this.hideModal('key-details-modal');
        });

        // Revoke key modal
        document.getElementById('close-revoke-key').addEventListener('click', () => {
            this.hideModal('revoke-key-modal');
        });

        document.getElementById('cancel-revoke').addEventListener('click', () => {
            this.hideModal('revoke-key-modal');
        });

        document.querySelector('#revoke-key-modal .modal-backdrop').addEventListener('click', () => {
            this.hideModal('revoke-key-modal');
        });

        document.getElementById('revoke-key-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.revokeKey();
        });

        // Rotate key modal
        document.getElementById('close-rotate-key').addEventListener('click', () => {
            this.hideModal('rotate-key-modal');
        });

        document.getElementById('cancel-rotate').addEventListener('click', () => {
            this.hideModal('rotate-key-modal');
        });

        document.querySelector('#rotate-key-modal .modal-backdrop').addEventListener('click', () => {
            this.hideModal('rotate-key-modal');
        });

        document.getElementById('rotate-key-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.rotateKey();
        });

        // Sign form
        document.getElementById('sign-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.signData();
        });

        document.getElementById('copy-signature').addEventListener('click', () => {
            const sig = document.getElementById('signature-output').textContent;
            navigator.clipboard.writeText(sig);
            this.showToast('Firma copiada al portapapeles', 'success');
        });

        // Audit refresh and filter
        document.getElementById('refresh-audit').addEventListener('click', () => {
            this.loadAudit();
        });

        document.getElementById('audit-filter').addEventListener('change', () => {
            this.loadAudit();
        });
    }

    // API Helpers
    async apiRequest(endpoint, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.apiKey) {
            headers['X-API-Key'] = this.apiKey;
        }

        const options = {
            method,
            headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en la solicitud');
        }

        return data;
    }

    // Auth
    login() {
        const apiKeyInput = document.getElementById('api-key').value.trim();
        if (!apiKeyInput) {
            this.showToast('Ingresa una API Key', 'error');
            return;
        }

        this.apiKey = apiKeyInput;
        localStorage.setItem('kms_api_key', apiKeyInput);
        this.showDashboard();
        this.loadDashboard();
        this.showToast('Conectado exitosamente', 'success');
    }

    logout() {
        this.apiKey = null;
        localStorage.removeItem('kms_api_key');
        this.showLogin();
        document.getElementById('api-key').value = '';
    }

    async createClient() {
        const name = document.getElementById('client-name').value.trim();
        const permissions = Array.from(document.querySelectorAll('.permission-checkbox input:checked'))
            .map(cb => cb.value)
            .join(',');

        if (!name) {
            this.showToast('Ingresa un nombre', 'error');
            return;
        }

        if (!permissions) {
            this.showToast('Selecciona al menos un permiso', 'error');
            return;
        }

        try {
            const data = await this.apiRequest('/clients', 'POST', {
                name,
                permissions
            });

            document.getElementById('new-api-key').textContent = data.api_key;
            document.getElementById('api-key-result').classList.remove('hidden');
            document.getElementById('create-client-form').classList.add('hidden');

            this.showToast('Cliente creado exitosamente', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // UI
    showLogin() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }

    showDashboard() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
        document.body.style.overflow = '';
        
        // Reset forms
        if (modalId === 'create-client-modal') {
            document.getElementById('create-client-form').classList.remove('hidden');
            document.getElementById('api-key-result').classList.add('hidden');
            document.getElementById('create-client-form').reset();
            document.querySelectorAll('.permission-checkbox input').forEach(cb => cb.checked = true);
        }
        if (modalId === 'create-key-modal') {
            document.getElementById('create-key-form').reset();
        }
        if (modalId === 'sign-result') {
            document.getElementById('sign-result').classList.add('hidden');
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');

        // Load data for tab
        if (tabName === 'overview') this.loadDashboard();
        if (tabName === 'keys') this.loadKeys();
        if (tabName === 'sign') this.loadKeysForSign();
        if (tabName === 'audit') this.loadAudit();
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
        };
        
        toast.innerHTML = `${icons[type] || ''} ${message}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    // Dashboard
    async loadDashboard() {
        try {
            const data = await this.apiRequest('/keys?include_inactive=true');
            const keys = data.keys || [];

            const total = keys.length;
            const active = keys.filter(k => k.is_active && !k.revoked && !this.isExpired(k)).length;
            const expired = keys.filter(k => this.isExpired(k)).length;
            const revoked = keys.filter(k => k.revoked).length;

            // Update all stat displays
            document.getElementById('stat-total').textContent = total;
            document.getElementById('stat-total-card').textContent = total;
            document.getElementById('stat-active').textContent = active;
            document.getElementById('stat-active-card').textContent = active;
            document.getElementById('stat-expired-card').textContent = expired;
            document.getElementById('stat-revoked-card').textContent = revoked;

            // Recent keys
            const recentKeys = keys.slice(0, 5);
            this.renderRecentKeys(recentKeys);

            // Recent activity
            this.loadRecentActivity();
        } catch (error) {
            this.showToast('Error al cargar dashboard: ' + error.message, 'error');
        }
    }

    async loadRecentActivity() {
        try {
            const data = await this.apiRequest('/audit?limit=5');
            const logs = data.audit_logs || [];

            const container = document.getElementById('recent-activity');
            
            if (logs.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <p>No hay actividad reciente</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = logs.map(log => {
                const icon = this.getActionIcon(log.action);
                return `
                    <div class="activity-item">
                        <div class="activity-icon">${icon}</div>
                        <div class="activity-info">
                            <span class="activity-action">${this.formatAction(log.action)}</span>
                            <span class="activity-time">${this.formatTime(log.timestamp)}</span>
                        </div>
                        <span class="audit-success ${log.success ? 'success' : 'error'}">
                            ${log.success ? '✓' : '✗'}
                        </span>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    }

    getActionIcon(action) {
        const icons = {
            'generate_key': '🔑',
            'sign_data': '✍️',
            'rotate_key': '🔄',
            'revoke_key': '🚫',
            'read_key': '👁️',
            'list_keys': '📋',
            'create_client': '👤'
        };
        return icons[action] || '📌';
    }

    isExpired(key) {
        if (!key.expires_at) return false;
        return new Date(key.expires_at) < new Date();
    }

    getStatus(key) {
        if (key.revoked) return 'revoked';
        if (this.isExpired(key)) return 'expired';
        if (key.is_active) return 'active';
        return 'inactive';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Hace un momento';
        if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
        if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    renderRecentKeys(keys) {
        const container = document.getElementById('recent-keys-list');

        if (keys.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                    </svg>
                    <p>No hay claves todavía</p>
                </div>
            `;
            return;
        }

        container.innerHTML = keys.map(key => this.renderKeyItem(key, false)).join('');
    }

    renderKeyItem(key, showActions = true) {
        const status = this.getStatus(key);
        const statusLabels = {
            active: 'Activa',
            expired: 'Expirada',
            revoked: 'Revocada',
            inactive: 'Inactiva'
        };

        const created = key.created_at ? new Date(key.created_at).toLocaleDateString('es-ES') : '-';
        const expires = key.expires_at ? new Date(key.expires_at).toLocaleDateString('es-ES') : 'Nunca';

        let actions = '';
        if (showActions && status === 'active') {
            actions = `
                <div class="key-actions">
                    <button class="btn-secondary" onclick="app.viewKey('${key.key_id}')">Ver</button>
                    <button class="btn-secondary" onclick="app.showRotateModal('${key.key_id}')">Rotar</button>
                    <button class="btn-danger" onclick="app.showRevokeModal('${key.key_id}')">Revocar</button>
                </div>
            `;
        }

        return `
            <div class="key-item">
                <div class="key-info">
                    <span class="key-id" title="${key.key_id}">${key.key_id}</span>
                    <span class="key-algorithm">${key.algorithm}</span>
                    <div class="key-meta">
                        <span>📅 ${created}</span>
                        <span>⏰ ${expires}</span>
                    </div>
                </div>
                <div class="key-status">
                    <span class="status-badge ${status}">${statusLabels[status]}</span>
                    ${actions}
                </div>
            </div>
        `;
    }

    // Keys
    async loadKeys() {
        try {
            const data = await this.apiRequest('/keys?include_inactive=true');
            let keys = data.keys || [];

            const filter = document.getElementById('key-filter').value;
            if (filter !== 'all') {
                keys = keys.filter(k => this.getStatus(k) === filter);
            }

            this.allKeys = keys;
            this.renderKeys(keys);
        } catch (error) {
            this.showToast('Error al cargar claves: ' + error.message, 'error');
        }
    }

    renderKeys(keys) {
        const container = document.getElementById('keys-list');
        
        if (keys.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                    </svg>
                    <p>No hay claves con este filtro</p>
                </div>
            `;
            return;
        }

        container.innerHTML = keys.map(key => this.renderKeyItem(key, true)).join('');
    }

    filterKeys(searchTerm) {
        if (!this.allKeys) return;
        
        const term = searchTerm.toLowerCase();
        const filtered = this.allKeys.filter(k => 
            k.key_id.toLowerCase().includes(term) ||
            k.algorithm.toLowerCase().includes(term)
        );
        
        this.renderKeys(filtered);
    }

    async createKey() {
        const algorithm = document.getElementById('key-algorithm').value;
        const purpose = document.getElementById('key-purpose').value;
        const expiresIn = parseInt(document.getElementById('key-expiry').value) || 30;
        const metadataInput = document.getElementById('key-metadata').value.trim();

        let metadata = {};
        if (metadataInput) {
            try {
                metadata = JSON.parse(metadataInput);
            } catch (e) {
                this.showToast('Metadata debe ser JSON válido', 'error');
                return;
            }
        }

        try {
            const data = await this.apiRequest('/keys', 'POST', {
                algorithm,
                purpose,
                expires_in_days: expiresIn,
                metadata
            });

            this.hideModal('create-key-modal');
            this.showToast('Clave creada exitosamente', 'success');
            this.loadKeys();
            this.loadDashboard();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async viewKey(keyId) {
        try {
            const data = await this.apiRequest('/keys?include_inactive=true');
            const key = data.keys.find(k => k.key_id === keyId);

            if (!key) {
                this.showToast('Clave no encontrada', 'error');
                return;
            }

            const status = this.getStatus(key);
            const statusLabels = {
                active: 'Activa',
                expired: 'Expirada',
                revoked: 'Revocada',
                inactive: 'Inactiva'
            };

            const content = document.getElementById('key-details-content');
            content.innerHTML = `
                <div class="key-details-grid">
                    <div class="detail-row">
                        <span class="detail-label">Key ID</span>
                        <span class="detail-value mono">${key.key_id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Algoritmo</span>
                        <span class="detail-value">${key.algorithm}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Propósito</span>
                        <span class="detail-value">${key.purpose || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Estado</span>
                        <span class="status-badge ${status}">${statusLabels[status]}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Versión</span>
                        <span class="detail-value">${key.version || 1}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Creada</span>
                        <span class="detail-value">${key.created_at ? new Date(key.created_at).toLocaleString('es-ES') : '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Expira</span>
                        <span class="detail-value">${key.expires_at ? new Date(key.expires_at).toLocaleString('es-ES') : 'Nunca'}</span>
                    </div>
                    ${key.public_key_hex ? `
                    <div class="detail-row">
                        <span class="detail-label">Public Key (Hex)</span>
                        <span class="detail-value mono">${key.public_key_hex}</span>
                    </div>
                    ` : ''}
                    ${key.metadata ? `
                    <div class="detail-row">
                        <span class="detail-label">Metadata</span>
                        <span class="detail-value mono">${typeof key.metadata === 'string' ? key.metadata : JSON.stringify(key.metadata, null, 2)}</span>
                    </div>
                    ` : ''}
                    ${key.revoked_at ? `
                    <div class="detail-row">
                        <span class="detail-label">Revocada</span>
                        <span class="detail-value">${new Date(key.revoked_at).toLocaleString('es-ES')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Razón de Revocación</span>
                        <span class="detail-value">${key.revocation_reason || '-'}</span>
                    </div>
                    ` : ''}
                </div>
            `;

            this.showModal('key-details-modal');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    showRevokeModal(keyId) {
        document.getElementById('revoke-key-id').value = keyId;
        document.getElementById('revoke-reason').value = '';
        this.showModal('revoke-key-modal');
    }

    async revokeKey() {
        const keyId = document.getElementById('revoke-key-id').value;
        const reason = document.getElementById('revoke-reason').value.trim();

        if (!reason) {
            this.showToast('Ingresa una razón', 'error');
            return;
        }

        try {
            await this.apiRequest('/revoke', 'POST', {
                key_id: keyId,
                reason
            });

            this.hideModal('revoke-key-modal');
            this.showToast('Clave revocada exitosamente', 'success');
            this.loadKeys();
            this.loadDashboard();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    showRotateModal(keyId) {
        document.getElementById('rotate-key-id').value = keyId;
        document.getElementById('keep-old-active').checked = false;
        this.showModal('rotate-key-modal');
    }

    async rotateKey() {
        const keyId = document.getElementById('rotate-key-id').value;
        const keepOld = document.getElementById('keep-old-active').checked;

        try {
            const data = await this.apiRequest('/rotate', 'POST', {
                old_key_id: keyId,
                keep_old_active: keepOld
            });

            this.hideModal('rotate-key-modal');
            this.showToast(`Clave rotada. Nueva versión: ${data.version}`, 'success');
            this.loadKeys();
            this.loadDashboard();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Sign
    async loadKeysForSign() {
        try {
            const data = await this.apiRequest('/keys?include_inactive=true');
            const activeKeys = (data.keys || []).filter(k => 
                k.is_active && !k.revoked && !this.isExpired(k)
            );

            const select = document.getElementById('sign-key-select');
            select.innerHTML = '<option value="">Selecciona una clave activa...</option>' +
                activeKeys.map(k => `<option value="${k.key_id}">${k.key_id} (${k.algorithm})</option>`).join('');
        } catch (error) {
            this.showToast('Error al cargar claves: ' + error.message, 'error');
        }
    }

    async signData() {
        const keyId = document.getElementById('sign-key-select').value;
        const hashHex = document.getElementById('sign-hash').value.trim();

        if (!keyId || !hashHex) {
            this.showToast('Selecciona una clave e ingresa el hash', 'error');
            return;
        }

        // Validate hex
        if (!/^[a-fA-F0-9]+$/.test(hashHex)) {
            this.showToast('El hash debe ser hexadecimal', 'error');
            return;
        }

        try {
            const data = await this.apiRequest('/sign', 'POST', {
                key_id: keyId,
                hash_hex: hashHex
            });

            document.getElementById('signature-output').textContent = data.signature_hex;
            document.getElementById('sign-result').classList.remove('hidden');
            this.showToast('Firma generada exitosamente', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
            document.getElementById('sign-result').classList.add('hidden');
        }
    }

    // Audit
    async loadAudit() {
        try {
            const data = await this.apiRequest('/audit?limit=50');
            let logs = data.audit_logs || [];

            const filter = document.getElementById('audit-filter').value;
            if (filter !== 'all') {
                logs = logs.filter(l => l.action === filter);
            }

            const container = document.getElementById('audit-list');

            if (logs.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <p>No hay logs de auditoría</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = logs.map(log => {
                const icon = this.getActionIcon(log.action);
                return `
                    <div class="audit-item">
                        <div class="audit-info">
                            <span class="audit-action">
                                <span class="action-icon">${icon}</span>
                                ${this.formatAction(log.action)}
                            </span>
                            <span class="audit-details">${log.details || '-'}</span>
                            <span class="audit-time">${new Date(log.timestamp).toLocaleString('es-ES')}</span>
                        </div>
                        <span class="audit-success ${log.success ? 'success' : 'error'}">
                            ${log.success ? 'Éxito' : 'Error'}
                        </span>
                    </div>
                `;
            }).join('');
        } catch (error) {
            this.showToast('Error al cargar auditoría: ' + error.message, 'error');
        }
    }

    formatAction(action) {
        const actions = {
            'generate_key': 'Generar clave',
            'sign_data': 'Firmar datos',
            'rotate_key': 'Rotar clave',
            'revoke_key': 'Revocar clave',
            'read_key': 'Leer clave',
            'list_keys': 'Listar claves',
            'create_client': 'Crear cliente',
            'audit_log': 'Ver auditoría'
        };
        return actions[action] || action;
    }
}

// Initialize app
const app = new KMSApp();