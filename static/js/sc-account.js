/**
 * OmicVerse Single Cell Analysis - Personal Center only
 */

Object.assign(SingleCellAnalysis.prototype, {

    setupAccountCenter() {
        this.accountTokenStorageKey = 'omicverse.accountToken';
        this.accountProfileStorageKey = 'omicverse.accountProfile';
        this.accountConfigured = true;
        this.accountUser = this.readCachedAccountProfile();
        this.accountMenuOpen = false;
        this.bindAccountCenterEvents();
        this.updateAccountMenu();
        this.refreshAccountProfile();
    },

    bindAccountCenterEvents() {
        const byId = (id) => document.getElementById(id);
        const dropdown = byId('account-menu-dropdown');
        const toggle = byId('account-menu-toggle');
        const panel = byId('account-menu-panel');

        if (toggle) {
            toggle.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.toggleAccountMenu();
            });
        }

        if (panel) {
            panel.addEventListener('click', (event) => {
                event.stopPropagation();
            });
        }

        document.addEventListener('click', (event) => {
            if (!this.accountMenuOpen || !dropdown) return;
            if (!dropdown.contains(event.target)) {
                this.closeAccountMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.accountMenuOpen) {
                this.closeAccountMenu();
            }
        });

        const clickHandlers = [
            ['account-login-link', () => this.openAuthModal('login')],
            ['account-register-link', () => this.openAuthModal('register')],
            ['account-profile-link', () => this.openAccountCenter(false)],
            ['account-settings-link', () => this.openAccountCenter(true)],
            ['account-help-link', () => this.openAccountHelp()],
            ['account-logout-link', () => this.logoutAccount()],
        ];

        clickHandlers.forEach(([id, handler]) => {
            const element = byId(id);
            if (!element) return;
            element.addEventListener('click', (event) => {
                event.preventDefault();
                handler();
            });
        });

        const loginForm = byId('account-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (event) => this.submitLogin(event));
        }

        const registerForm = byId('account-register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (event) => this.submitRegister(event));
        }

        const profileForm = byId('account-profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (event) => this.submitProfileUpdate(event));
        }

        const accountCenterForm = byId('account-center-form');
        if (accountCenterForm) {
            accountCenterForm.addEventListener('submit', (event) => this.submitAccountCenterUpdate(event));
        }
    },

    toggleAccountMenu() {
        if (this.accountMenuOpen) {
            this.closeAccountMenu();
        } else {
            this.openAccountMenu();
        }
    },

    openAccountMenu() {
        const dropdown = document.getElementById('account-menu-dropdown');
        const toggle = document.getElementById('account-menu-toggle');
        const panel = document.getElementById('account-menu-panel');
        if (!dropdown || !toggle || !panel) return;
        dropdown.classList.add('show');
        panel.classList.add('show');
        toggle.setAttribute('aria-expanded', 'true');
        this.accountMenuOpen = true;
    },

    closeAccountMenu() {
        const dropdown = document.getElementById('account-menu-dropdown');
        const toggle = document.getElementById('account-menu-toggle');
        const panel = document.getElementById('account-menu-panel');
        if (dropdown) dropdown.classList.remove('show');
        if (panel) panel.classList.remove('show');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
        this.accountMenuOpen = false;
    },

    getAccountToken() {
        return localStorage.getItem(this.accountTokenStorageKey) || '';
    },

    setAccountToken(token) {
        if (token) {
            localStorage.setItem(this.accountTokenStorageKey, token);
        } else {
            localStorage.removeItem(this.accountTokenStorageKey);
        }
    },

    readCachedAccountProfile() {
        try {
            const raw = localStorage.getItem(this.accountProfileStorageKey);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    },

    cacheAccountProfile(user) {
        if (user) {
            localStorage.setItem(this.accountProfileStorageKey, JSON.stringify(user));
        } else {
            localStorage.removeItem(this.accountProfileStorageKey);
        }
    },

    getAccountHeaders(includeJson = false) {
        const headers = {};
        if (includeJson) {
            headers['Content-Type'] = 'application/json';
        }
        const token = this.getAccountToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    updateAccountMenu() {
        const title = document.getElementById('account-menu-title');
        const subtitle = document.getElementById('account-menu-subtitle');
        const avatar = document.getElementById('account-avatar-letter');
        const menuAvatar = document.getElementById('account-menu-avatar-letter');
        const authOnlyIds = ['account-profile-link', 'account-settings-link', 'account-logout-link'];
        const guestOnlyIds = ['account-login-link', 'account-register-link'];
        const isAuthenticated = !!this.accountUser;
        const name = isAuthenticated
            ? (this.accountUser.display_name || this.accountUser.email || 'U')
            : this.t('account.guest');
        const subtitleText = !this.accountConfigured
            ? this.t('account.serverOffline')
            : (isAuthenticated ? (this.accountUser.email || '') : this.t('account.guestHint'));

        if (title) title.textContent = isAuthenticated ? name : this.t('account.center');
        if (subtitle) subtitle.textContent = subtitleText;
        if (avatar) avatar.textContent = String(name || 'G').trim().charAt(0).toUpperCase() || 'G';
        if (menuAvatar) menuAvatar.textContent = String(name || 'G').trim().charAt(0).toUpperCase() || 'G';

        authOnlyIds.forEach((id) => {
            const element = document.getElementById(id);
            if (!element) return;
            element.style.display = isAuthenticated ? '' : 'none';
        });

        guestOnlyIds.forEach((id) => {
            const element = document.getElementById(id);
            if (!element) return;
            element.style.display = isAuthenticated ? 'none' : '';
        });
    },

    showAccountMessage(id, message = '', tone = 'danger') {
        const box = document.getElementById(id);
        if (!box) return;
        if (!message) {
            box.style.display = 'none';
            box.textContent = '';
            box.className = 'alert d-none';
            return;
        }
        box.className = `alert alert-${tone}`;
        box.textContent = message;
        box.style.display = '';
    },

    openAuthModal(mode = 'login') {
        this.closeAccountMenu();
        this.showAccountMessage(
            'account-auth-message',
            this.accountConfigured ? '' : this.t('account.serverOffline'),
            this.accountConfigured ? 'danger' : 'warning'
        );
        const targetId = mode === 'register' ? 'account-register-tab' : 'account-login-tab';
        const target = document.getElementById(targetId);
        if (target && window.bootstrap && bootstrap.Tab) {
            bootstrap.Tab.getOrCreateInstance(target).show();
        }
        const modalEl = document.getElementById('accountAuthModal');
        if (modalEl && window.bootstrap) {
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        } else if (!this.accountConfigured) {
            alert(this.t('account.serverOffline'));
        }
    },

    openProfileModal(editable = false) {
        this.closeAccountMenu();
        if (!this.accountUser) {
            this.openAuthModal('login');
            return;
        }
        const title = document.getElementById('account-profile-modal-title');
        const displayName = document.getElementById('account-profile-display-name');
        const email = document.getElementById('account-profile-email');
        const hint = document.getElementById('account-profile-hint');
        const saveBtn = document.getElementById('account-profile-save-btn');

        if (title) {
            title.textContent = editable ? this.t('account.settings') : this.t('account.profile');
        }
        if (displayName) {
            displayName.value = this.accountUser.display_name || '';
            displayName.readOnly = !editable;
        }
        if (email) {
            email.value = this.accountUser.email || '';
        }
        if (hint) {
            hint.textContent = editable ? this.t('account.profileHintEditable') : this.t('account.profileHintReadonly');
        }
        if (saveBtn) {
            saveBtn.style.display = editable ? '' : 'none';
        }

        this.showAccountMessage('account-profile-message', '');
        const modalEl = document.getElementById('accountProfileModal');
        if (modalEl && window.bootstrap) {
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
    },

    openAccountCenter(editable = false) {
        this.closeAccountMenu();
        if (!this.accountUser) {
            this.openAuthModal('login');
            return;
        }
        this.accountCenterEditable = !!editable;
        if (this.switchView) {
            this.switchView('account');
        } else {
            this.renderAccountCenter();
        }
    },

    renderAccountCenter() {
        const user = this.accountUser;
        const editable = !!this.accountCenterEditable;
        const title = document.getElementById('account-view-title');
        const subtitle = document.getElementById('account-view-subtitle');
        const avatar = document.getElementById('account-view-avatar');
        const email = document.getElementById('account-view-email');
        const created = document.getElementById('account-view-created');
        const status = document.getElementById('account-view-status');
        const panelTitle = document.getElementById('account-panel-title');
        const panelSubtitle = document.getElementById('account-panel-subtitle');
        const displayNameInput = document.getElementById('account-center-display-name');
        const emailInput = document.getElementById('account-center-email');
        const hint = document.getElementById('account-center-hint');
        const saveBtn = document.getElementById('account-center-save-btn');
        const editBtn = document.getElementById('account-center-edit-btn');

        if (!user) {
            if (title) title.textContent = this.t('account.center');
            if (subtitle) subtitle.textContent = this.t('account.guestHint');
            if (avatar) avatar.textContent = 'G';
            if (email) email.textContent = '-';
            if (created) created.textContent = this.t('account.serverOffline');
            if (status) status.textContent = this.t('account.guest');
            return;
        }

        const name = user.display_name || user.email || this.t('account.center');
        if (title) title.textContent = name;
        if (subtitle) subtitle.textContent = user.email || '';
        if (avatar) avatar.textContent = String(name).trim().charAt(0).toUpperCase() || 'U';
        if (email) email.textContent = user.email || '-';
        if (created) created.textContent = `${this.t('account.memberSince')}: ${this.formatAccountDate(user.created_at)}`;
        if (status) status.textContent = editable ? this.t('account.editing') : this.t('account.active');
        if (panelTitle) panelTitle.textContent = editable ? this.t('account.settings') : this.t('account.profile');
        if (panelSubtitle) panelSubtitle.textContent = this.t('account.profileIntro');
        if (displayNameInput) {
            displayNameInput.value = user.display_name || '';
            displayNameInput.readOnly = !editable;
        }
        if (emailInput) {
            emailInput.value = user.email || '';
        }
        if (hint) {
            hint.textContent = editable ? this.t('account.profileHintEditable') : this.t('account.profileHintReadonly');
        }
        if (saveBtn) {
            saveBtn.style.display = editable ? '' : 'none';
        }
        if (editBtn) {
            editBtn.style.display = editable ? 'none' : '';
        }
        this.showAccountMessage('account-center-message', '');
    },

    formatAccountDate(value) {
        if (!value) return '-';
        try {
            return new Date(value).toLocaleDateString();
        } catch (_) {
            return String(value);
        }
    },

    async refreshAccountProfile() {
        try {
            const response = await fetch('/api/account/me', {
                headers: this.getAccountHeaders(false),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Account request failed');
            }
            this.accountConfigured = data.configured !== false;
            if (data.authenticated && data.user) {
                this.accountUser = data.user;
                this.cacheAccountProfile(data.user);
            } else {
                this.accountUser = null;
                this.cacheAccountProfile(null);
                if (data.configured !== false) {
                    this.setAccountToken('');
                }
            }
        } catch (_) {
            this.accountConfigured = false;
        }
        this.updateAccountMenu();
        if (this.currentView === 'account') {
            this.renderAccountCenter();
        }
    },

    async submitLogin(event) {
        event.preventDefault();
        const email = document.getElementById('account-login-email')?.value?.trim() || '';
        const password = document.getElementById('account-login-password')?.value || '';

        if (!this.accountConfigured) {
            this.showAccountMessage('account-auth-message', this.t('account.serverOffline'), 'warning');
            return;
        }

        try {
            const response = await fetch('/api/account/login', {
                method: 'POST',
                headers: this.getAccountHeaders(true),
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error || this.t('account.loginFailed'));
            }
            this.setAccountToken(data.token || '');
            this.accountUser = data.user || null;
            this.cacheAccountProfile(this.accountUser);
            this.updateAccountMenu();
            const modalEl = document.getElementById('accountAuthModal');
            if (modalEl && window.bootstrap) {
                bootstrap.Modal.getOrCreateInstance(modalEl).hide();
            }
            this.openAccountCenter(false);
            this.showStatus(this.t('account.loginSuccess'), false);
        } catch (error) {
            this.showAccountMessage('account-auth-message', error.message || this.t('account.loginFailed'));
        }
    },

    async submitRegister(event) {
        event.preventDefault();
        const display_name = document.getElementById('account-register-name')?.value?.trim() || '';
        const email = document.getElementById('account-register-email')?.value?.trim() || '';
        const password = document.getElementById('account-register-password')?.value || '';

        if (!this.accountConfigured) {
            this.showAccountMessage('account-auth-message', this.t('account.serverOffline'), 'warning');
            return;
        }

        try {
            const response = await fetch('/api/account/register', {
                method: 'POST',
                headers: this.getAccountHeaders(true),
                body: JSON.stringify({ display_name, email, password }),
            });
            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error || this.t('account.registerFailed'));
            }
            this.setAccountToken(data.token || '');
            this.accountUser = data.user || null;
            this.cacheAccountProfile(this.accountUser);
            this.updateAccountMenu();
            const modalEl = document.getElementById('accountAuthModal');
            if (modalEl && window.bootstrap) {
                bootstrap.Modal.getOrCreateInstance(modalEl).hide();
            }
            this.openAccountCenter(true);
            this.showStatus(this.t('account.registerSuccess'), false);
        } catch (error) {
            this.showAccountMessage('account-auth-message', error.message || this.t('account.registerFailed'));
        }
    },

    async submitProfileUpdate(event) {
        event.preventDefault();
        if (!this.accountUser) return;

        const display_name = document.getElementById('account-profile-display-name')?.value?.trim() || '';
        try {
            const response = await fetch('/api/account/profile', {
                method: 'PATCH',
                headers: this.getAccountHeaders(true),
                body: JSON.stringify({ display_name }),
            });
            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error || this.t('account.profileSaveFailed'));
            }
            this.accountUser = data.user || this.accountUser;
            this.cacheAccountProfile(this.accountUser);
            this.updateAccountMenu();
            this.showAccountMessage('account-profile-message', this.t('account.profileSaved'), 'success');
            this.showStatus(this.t('account.profileSaved'), false);
        } catch (error) {
            this.showAccountMessage('account-profile-message', error.message || this.t('account.profileSaveFailed'));
        }
    },

    async submitAccountCenterUpdate(event) {
        event.preventDefault();
        if (!this.accountCenterEditable) return;
        const display_name = document.getElementById('account-center-display-name')?.value?.trim() || '';
        try {
            const response = await fetch('/api/account/profile', {
                method: 'PATCH',
                headers: this.getAccountHeaders(true),
                body: JSON.stringify({ display_name }),
            });
            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error || this.t('account.profileSaveFailed'));
            }
            this.accountUser = data.user || this.accountUser;
            this.cacheAccountProfile(this.accountUser);
            this.accountCenterEditable = false;
            this.updateAccountMenu();
            this.renderAccountCenter();
            this.showAccountMessage('account-center-message', this.t('account.profileSaved'), 'success');
            this.showStatus(this.t('account.profileSaved'), false);
        } catch (error) {
            this.showAccountMessage('account-center-message', error.message || this.t('account.profileSaveFailed'));
        }
    },

    async logoutAccount() {
        try {
            await fetch('/api/account/logout', {
                method: 'POST',
                headers: this.getAccountHeaders(false),
            });
        } catch (_) {
            // Ignore network failure during local logout.
        }
        this.setAccountToken('');
        this.accountUser = null;
        this.cacheAccountProfile(null);
        this.accountCenterEditable = false;
        this.updateAccountMenu();
        if (this.currentView === 'account' && this.switchView) {
            this.switchView('visualization');
        }
        this.showStatus(this.t('account.logoutSuccess'), false);
    },

    openAccountHelp() {
        this.closeAccountMenu();
        alert(this.t('account.helpText'));
    },
});
