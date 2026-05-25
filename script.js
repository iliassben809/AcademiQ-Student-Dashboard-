
'use strict';

// ── Constants ──
const SUBJECT_COLORS = [
  '#2A52CC', '#6D2FCC', '#1A7A50', '#C96A08', '#C42B2B',
  '#0877B0', '#B0187A', '#0C5C3C', '#8B4000', '#1B4CC0'
];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

// ── Storage ──
const Store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem('aq_' + key); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('aq_' + key, JSON.stringify(value)); }
    catch (e) { console.warn('Storage:', e); }
  },
  remove(key) { localStorage.removeItem('aq_' + key); }
};

// ── Auth System ──
// Manages all user accounts in localStorage
const Auth = {
  // Get all registered accounts
  getAccounts() {
    return Store.get('accounts', [
      // Built-in demo accounts (only used if no accounts exist yet)
      { email: 'alex.martin@school.edu', password: 'password', name: 'Alex Martin', program: 'Computer Science', year: 3, studentId: 'STU-2024-00847', phone: '', bio: '', avatar: null },
      { email: 'student@school.edu', password: '1234', name: 'Student Demo', program: 'Mathematics', year: 2, studentId: 'STU-2024-00001', phone: '', bio: '', avatar: null },
    ]);
  },

  // Save all accounts
  saveAccounts(accounts) {
    Store.set('accounts', accounts);
  },

  // Find account by email (case-insensitive)
  findAccount(email) {
    return this.getAccounts().find(a => a.email.toLowerCase() === email.toLowerCase());
  },

  // Authenticate user
  login(email, password) {
    const account = this.findAccount(email);
    if (!account) return { success: false, error: 'No account found with this email.' };
    if (account.password !== password) return { success: false, error: 'Incorrect password.' };
    return { success: true, account };
  },

  // Register a new account
  register(data) {
    const accounts = this.getAccounts();
    if (accounts.find(a => a.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, error: 'An account with this email already exists.' };
    }
    const newAccount = {
      email: data.email,
      password: data.password,
      name: data.name,
      program: data.program || 'General Studies',
      year: data.year || 1,
      studentId: 'STU-' + Date.now(),
      phone: '', bio: '', avatar: null
    };
    accounts.push(newAccount);
    this.saveAccounts(accounts);
    return { success: true, account: newAccount };
  },

  // Update account data (profile edits, password changes)
  updateAccount(email, updates) {
    const accounts = this.getAccounts();
    const idx = accounts.findIndex(a => a.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) return false;
    Object.assign(accounts[idx], updates);
    this.saveAccounts(accounts);
    return true;
  },

  // Session management
  setSession(email, remember) {
    Store.set('session_email', email);
    Store.set('session_remember', remember);
  },
  getSession() {
    const email = Store.get('session_email');
    if (!email) return null;
    return this.findAccount(email) || null;
  },
  clearSession() {
    Store.remove('session_email');
    Store.remove('session_remember');
  },
  isLoggedIn() {
    return !!Store.get('session_email');
  }
};

// ── Toast ──
const Toast = {
  show(msg, type = 'default', duration = 3000) {
    const icons = { success: '✓', error: '✕', warning: '⚠', default: 'ℹ' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type] || icons.default}</span><span class="toast-msg">${msg}</span>`;
    const container = document.getElementById('toast-container');
    container.appendChild(t);
    setTimeout(() => {
      t.classList.add('toast-out');
      setTimeout(() => t.remove(), 350);
    }, duration);
  }
};

// ── Modal ──
const Modal = {
  open(title, bodyHTML, onConfirm = null, confirmLabel = 'Save') {
    document.getElementById('modal-title').textContent = title;
    const body = document.getElementById('modal-body');
    body.innerHTML = bodyHTML;
    document.getElementById('modal-overlay').classList.add('open');
    if (onConfirm) {
      const actions = document.createElement('div');
      actions.className = 'modal-actions';
      actions.innerHTML = `<button class="btn-secondary" onclick="Modal.close()">Cancel</button>`;
      const btn = document.createElement('button');
      btn.className = 'btn-primary';
      btn.textContent = confirmLabel;
      btn.onclick = onConfirm;
      actions.appendChild(btn);
      body.appendChild(actions);
    }
    setTimeout(() => {
      const first = body.querySelector('input:not([type=radio]):not([type=checkbox]), select');
      if (first) first.focus();
    }, 100);
  },
  close() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.getElementById('modal-body').innerHTML = '';
  }
};


// ── Custom Confirm Dialog ──
const Confirm = {
  show(opts) {
    // opts: { title, message, confirmLabel, confirmClass, icon, onConfirm }
    const {
      title = 'Are you sure?',
      message = '',
      confirmLabel = 'Confirm',
      confirmClass = 'btn-primary',
      icon = '❓',
      onConfirm
    } = opts;

    // Remove any existing confirm dialog
    const old = document.getElementById('confirm-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'confirm-overlay';
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog" id="confirm-dialog">
        <div class="confirm-icon">${icon}</div>
        <h3 class="confirm-title">${title}</h3>
        ${message ? `<p class="confirm-message">${message}</p>` : ''}
        <div class="confirm-actions">
          <button class="btn-secondary confirm-cancel" id="confirm-cancel">Cancel</button>
          <button class="${confirmClass} confirm-ok" id="confirm-ok">${confirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('open'));

    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
    };

    document.getElementById('confirm-cancel').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    document.getElementById('confirm-ok').onclick = () => {
      close();
      if (onConfirm) onConfirm();
    };

    // Keyboard: Escape = cancel, Enter = confirm
    const onKey = (e) => {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
      if (e.key === 'Enter') { close(); if (onConfirm) onConfirm(); document.removeEventListener('keydown', onKey); }
    };
    document.addEventListener('keydown', onKey);

    // Focus confirm button
    setTimeout(() => document.getElementById('confirm-ok')?.focus(), 50);
  }
};

// ── Notifications ──
const Notif = {
  list: Store.get('notifications', []),
  add(msg) {
    this.list.unshift({ msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), id: Date.now() });
    if (this.list.length > 20) this.list = this.list.slice(0, 20);
    Store.set('notifications', this.list);
    this.render();
  },
  render() {
    const el = document.getElementById('notif-list');
    const dot = document.getElementById('notif-dot');
    if (!el) return;
    if (!this.list.length) {
      el.innerHTML = '<div class="notif-empty">No new notifications</div>';
      dot.classList.remove('show');
    } else {
      dot.classList.add('show');
      el.innerHTML = this.list.slice(0, 8).map(n =>
        `<div class="notif-item"><div>${n.msg}</div><div class="notif-time">${n.time}</div></div>`
      ).join('');
    }
  }
};

// ── Profile ──
// Profile now reads/writes to the Auth accounts store, keeping everything in sync
const Profile = {
  get() {
    const session = Auth.getSession();
    if (session) return session;
    // Fallback defaults if somehow no session
    return { name: 'Student', email: '', program: '', year: 1, studentId: '', phone: '', bio: '', avatar: null };
  },

  save(data) {
    const current = this.get();
    // Update in the accounts store
    Auth.updateAccount(current.email, data);
    this.applyToUI();
  },

  initials(name) {
    return (name || '??').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  applyToUI() {
    const p = this.get();
    const ini = this.initials(p.name);

    ['topbar-avatar', 'sidebar-avatar'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (p.avatar) {
        el.innerHTML = `<img src="${p.avatar}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
      } else {
        el.innerHTML = ini;
      }
    });

    const setTxt = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    setTxt('topbar-name', p.name);
    setTxt('topbar-sub', `Year ${p.year} · ${p.program}`);
    setTxt('sidebar-name', p.name);
    setTxt('sidebar-sub', `Year ${p.year} · ${(p.program || '').split(' ')[0]}`);

    const greet = document.getElementById('dashboard-greeting');
    if (greet) {
      const h = new Date().getHours();
      const g = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
      greet.textContent = `Good ${g}, ${(p.name || 'Student').split(' ')[0]} 👋`;
    }
  }
};

// ── Validation helpers ──
const Validate = {
  email(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); },
  required(v) { return (v || '').trim().length > 0; },
  minLen(v, n) { return (v || '').length >= n; }
};

// ── App Core ──
const App = {
  currentPage: 'dashboard',
  theme: Store.get('theme', 'light'),
  sidebarOpen: false,

  init() {
    document.documentElement.setAttribute('data-theme', this.theme);
    this._syncThemeIcons();

    const now = new Date();
    const el = document.getElementById('header-date');
    if (el) el.innerHTML =
      now.toLocaleDateString('en-US', { weekday: 'long' }) + '<br>' +
      now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    Profile.applyToUI();

    Grades.init();
    Schedule.init();
    Tasks.init();
    Absences.init();
    Notif.render();
    this.renderDashboard();

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        Modal.close();
        this.closeNotifications();
        const sr = document.getElementById('search-results');
        if (sr) sr.classList.remove('open');
        if (this.sidebarOpen) this.closeSidebar();
      }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.notif-wrapper')) this.closeNotifications();
      if (!e.target.closest('.search-bar')) {
        const sr = document.getElementById('search-results');
        if (sr) sr.classList.remove('open');
      }
    });
  },

  // ── LOGIN ──
  login() {
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    const email = (emailEl.value || '').trim();
    const pass = passEl.value || '';

    // Clear previous errors
    this._clearFieldErrors();

    let hasError = false;
    if (!email) { this._fieldError(emailEl, 'Email is required'); hasError = true; }
    else if (!Validate.email(email)) { this._fieldError(emailEl, 'Enter a valid email address'); hasError = true; }
    if (!pass) { this._fieldError(passEl, 'Password is required'); hasError = true; }

    if (hasError) return;

    const result = Auth.login(email, pass);

    if (!result.success) {
      Toast.show(result.error, 'error');
      passEl.value = '';
      passEl.focus();
      const card = document.getElementById('login-card-main');
      card.style.animation = 'none';
      requestAnimationFrame(() => { card.style.animation = 'shake 0.4s ease'; });
      return;
    }

    const remember = document.getElementById('remember-me-check').checked;
    Auth.setSession(result.account.email, remember);

    const lp = document.getElementById('login-page');
    lp.style.transition = 'opacity .35s ease, transform .35s ease';
    lp.style.opacity = '0';
    lp.style.transform = 'scale(1.04)';
    setTimeout(() => {
      lp.classList.add('hidden');
      lp.style = '';
      document.getElementById('app').classList.remove('hidden');
      this.init();
      Toast.show(`Welcome back, ${result.account.name.split(' ')[0]}! 👋`, 'success');
    }, 350);
  },

  // ── REGISTRATION ──
  showRegister() {
    document.getElementById('login-card-main').style.display = 'none';
    document.getElementById('login-card-register').style.display = 'block';
    const inp = document.getElementById('reg-name');
    if (inp) inp.focus();
  },

  register() {
    const name = (document.getElementById('reg-name').value || '').trim();
    const email = (document.getElementById('reg-email').value || '').trim();
    const pass = (document.getElementById('reg-password').value || '');
    const program = (document.getElementById('reg-program').value || '').trim();
    const year = parseInt(document.getElementById('reg-year').value) || 1;

    this._clearFieldErrors();
    let hasError = false;
    if (!name) { this._fieldError(document.getElementById('reg-name'), 'Full name is required'); hasError = true; }
    if (!email || !Validate.email(email)) { this._fieldError(document.getElementById('reg-email'), 'Valid email required'); hasError = true; }
    if (!Validate.minLen(pass, 4)) { this._fieldError(document.getElementById('reg-password'), 'Min. 4 characters'); hasError = true; }
    if (hasError) return;

    const result = Auth.register({ name, email, password: pass, program, year });
    if (!result.success) { Toast.show(result.error, 'error'); return; }

    Auth.setSession(result.account.email, false);

    const lp = document.getElementById('login-page');
    lp.style.transition = 'opacity .35s ease, transform .35s ease';
    lp.style.opacity = '0';
    lp.style.transform = 'scale(1.04)';
    setTimeout(() => {
      lp.classList.add('hidden');
      lp.style = '';
      document.getElementById('app').classList.remove('hidden');
      this.init();
      Toast.show(`Welcome to AcademiQ, ${name.split(' ')[0]}! 🎓`, 'success');
    }, 350);
  },

  // ── LOGOUT ──
  logout() {
    Confirm.show({
      title: 'Sign out?',
      message: 'You will be returned to the login screen.',
      confirmLabel: 'Sign out',
      confirmClass: 'btn-ghost-danger',
      icon: '⏻',
      onConfirm: () => {
        Auth.clearSession();
        document.getElementById('app').classList.add('hidden');
        const lp = document.getElementById('login-page');
        lp.classList.remove('hidden');
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        App.showLogin();
        Toast.show('Signed out successfully', 'default');
      }
    });
  },


  // ── FORGOT PASSWORD ──
  showForgot() {
    document.getElementById('login-card-main').style.display = 'none';
    document.getElementById('login-card-forgot').style.display = 'block';
    document.getElementById('forgot-form-wrap').style.display = 'block';
    document.getElementById('forgot-success-wrap').style.display = 'none';
    const inp = document.getElementById('forgot-email');
    if (inp) { inp.value = ''; inp.focus(); }
  },
  showLogin() {
    document.querySelectorAll('.login-card').forEach(c => c.style.display = 'none');
    document.getElementById('login-card-main').style.display = 'block';
  },

  // ── FIELD VALIDATION HELPERS ──
  _fieldError(input, msg) {
    if (!input) return;
    input.classList.add('input-error');
    let err = input.parentElement.querySelector('.field-error-msg');
    if (!err) {
      err = document.createElement('span');
      err.className = 'field-error-msg';
      input.parentElement.appendChild(err);
    }
    err.textContent = msg;
    input.addEventListener('input', () => {
      input.classList.remove('input-error');
      err.remove();
    }, { once: true });
  },
  _clearFieldErrors() {
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.querySelectorAll('.field-error-msg').forEach(el => el.remove());
  },

  // ── PASSWORD TOGGLE ──
  togglePasswordView(inputId = 'login-password', eyeId = 'pass-eye') {
    const inp = document.getElementById(inputId);
    const eye = document.getElementById(eyeId);
    if (!inp || !eye) return;
    if (inp.type === 'password') { inp.type = 'text'; eye.textContent = '🙈'; }
    else { inp.type = 'password'; eye.textContent = '👁'; }
  },

  // ── THEME ──
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.theme);
    Store.set('theme', this.theme);
    this._syncThemeIcons();
    Toast.show(this.theme === 'dark' ? '🌙 Dark mode' : '☀️ Light mode', 'default', 1500);
  },
  _syncThemeIcons() {
    const icon = this.theme === 'dark' ? '☽' : '☀';
    ['theme-icon', 'login-theme-icon'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = icon;
    });
  },

  // ── NAVIGATION ──
  navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const pageEl = document.getElementById('page-' + page);
    if (!pageEl) return;
    pageEl.classList.add('active');
    const navEl = document.querySelector(`[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');
    this.currentPage = page;
    this.closeSidebar();

    if (page === 'statistics') Statistics.render();
    if (page === 'settings') Settings.render();
    if (page === 'profile') ProfilePage.render();
    if (page === 'dashboard') this.renderDashboard();
  },

  // ── SIDEBAR ──
  toggleSidebar() { this.sidebarOpen ? this.closeSidebar() : this.openSidebar(); },
  openSidebar() {
    this.sidebarOpen = true;
    document.getElementById('sidebar').classList.add('open');
    this._getOrCreateOverlay().classList.add('show');
  },
  closeSidebar() {
    this.sidebarOpen = false;
    document.getElementById('sidebar').classList.remove('open');
    const o = document.getElementById('sidebar-overlay');
    if (o) o.classList.remove('show');
  },
  _getOrCreateOverlay() {
    let o = document.getElementById('sidebar-overlay');
    if (!o) {
      o = document.createElement('div');
      o.className = 'sidebar-overlay';
      o.id = 'sidebar-overlay';
      o.onclick = () => this.closeSidebar();
      document.body.appendChild(o);
    }
    return o;
  },

  // ── NOTIFICATIONS ──
  toggleNotifications() { document.getElementById('notif-panel').classList.toggle('open'); },
  closeNotifications() { document.getElementById('notif-panel').classList.remove('open'); },
  clearNotifications() {
    Notif.list = []; Store.set('notifications', []); Notif.render();
    Toast.show('Notifications cleared', 'default', 1500);
  },

  // ── SEARCH ──
  search(q) {
    const res = document.getElementById('search-results');
    if (!q.trim()) { res.classList.remove('open'); return; }
    const lq = q.toLowerCase(), items = [];
    Grades.subjects.forEach(s => {
      if (s.name.toLowerCase().includes(lq))
        items.push({ icon: '◎', text: s.name, type: 'Subject', page: 'grades' });
    });
    Tasks.tasks.forEach(t => {
      if (t.title.toLowerCase().includes(lq))
        items.push({ icon: '◉', text: t.title, type: 'Task', page: 'tasks' });
    });
    Schedule.classes.forEach(c => {
      if (c.subject.toLowerCase().includes(lq))
        items.push({ icon: '◷', text: c.subject, type: 'Class', page: 'schedule' });
    });
    res.innerHTML = items.length
      ? items.slice(0, 6).map(i =>
        `<div class="search-result-item" onclick="App.navigate('${i.page}');document.getElementById('search-results').classList.remove('open')">
            <span class="sri-icon">${i.icon}</span><span>${i.text}</span><span class="sri-type">${i.type}</span>
          </div>`).join('')
      : '<div class="search-result-item"><span class="sri-icon">∅</span> No results found</div>';
    res.classList.add('open');
  },

  // ── DASHBOARD ──
  renderDashboard() {
    const avg = Grades.getGlobalAverage();
    const safe = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };

    safe('dash-avg', avg !== null ? avg.toFixed(2) : '—');
    safe('global-avg-display', avg !== null ? avg.toFixed(2) + '/20' : '—');

    const pending = Tasks.tasks.filter(t => !t.completed).length;
    safe('dash-tasks', pending);
    const badge = document.getElementById('tasks-badge');
    if (badge) { badge.textContent = pending; badge.classList.toggle('zero', pending === 0); }

    safe('dash-abs', Absences.absences.length);

    const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    const todayClasses = Schedule.classes.filter(c => c.day === todayName);
    safe('dash-classes', todayClasses.length);

    const schEl = document.getElementById('dash-today-schedule');
    if (schEl) schEl.innerHTML = todayClasses.length === 0
      ? '<div class="empty-state"><div class="es-icon">◷</div>No classes today</div>'
      : todayClasses.slice(0, 4).map(c =>
        `<div class="schedule-mini-item">
            <div class="smi-dot" style="background:${c.color}"></div>
            <div class="smi-info"><div class="smi-name">${c.subject}</div><div class="smi-time">${c.time} · ${c.room}</div></div>
          </div>`).join('');

    const taskEl = document.getElementById('dash-upcoming-tasks');
    const upcoming = Tasks.tasks.filter(t => !t.completed)
      .sort((a, b) => new Date(a.due || '9999') - new Date(b.due || '9999')).slice(0, 4);
    if (taskEl) taskEl.innerHTML = upcoming.length === 0
      ? '<div class="empty-state"><div class="es-icon">◉</div>No pending tasks</div>'
      : upcoming.map(t => {
        const pc = { high: '#C42B2B', medium: '#C96A08', low: '#1A7A50' }[t.priority] || '#ccc';
        return `<div class="task-mini-item">
            <div class="tmi-priority" style="background:${pc}"></div>
            <div><div class="tmi-title">${t.title}</div>
            <div class="tmi-date">${t.subject ? t.subject + ' · ' : ''}${t.due ? 'Due ' + t.due : 'No date'}</div></div>
          </div>`;
      }).join('');

    const barEl = document.getElementById('dash-subject-bars');
    if (barEl) barEl.innerHTML = Grades.subjects.length === 0
      ? '<div class="empty-state"><div class="es-icon">◎</div>No subjects added yet</div>'
      : Grades.subjects.map(s => {
        const a = Grades.getSubjectAverage(s.id);
        const pct = a !== null ? (a / 20 * 100) : 0;
        return `<div class="subject-bar-row">
            <div class="sbr-name">${s.name}</div>
            <div class="sbr-track"><div class="sbr-fill" style="width:${pct}%;background:${s.color}"></div></div>
            <div class="sbr-val" style="color:${s.color}">${a !== null ? a.toFixed(1) : '—'}</div>
          </div>`;
      }).join('');
  }
};

// ── Forgot Password ──
const ForgotPassword = {
  send() {
    const emailEl = document.getElementById('forgot-email');
    const email = (emailEl.value || '').trim();
    if (!email) { App._fieldError(emailEl, 'Enter your email address'); return; }
    if (!Validate.email(email)) { App._fieldError(emailEl, 'Enter a valid email'); return; }
    // Always show success for security
    document.getElementById('forgot-form-wrap').style.display = 'none';
    document.getElementById('forgot-success-wrap').style.display = 'block';
    Toast.show('Reset link sent (demo mode)', 'success');
  }
};

// ── Profile Page ──
const ProfilePage = {
  render() {
    const container = document.getElementById('profile-container');
    if (!container) return;
    const p = Profile.get();

    container.innerHTML = `
      <div class="profile-layout">
        <div class="profile-sidebar-card">
          <div class="profile-avatar-wrap">
            <div class="profile-avatar" id="prof-avatar-el">
              ${p.avatar ? `<img src="${p.avatar}" alt="avatar"/>` : Profile.initials(p.name)}
            </div>
            <div class="profile-avatar-overlay" onclick="ProfilePage.triggerUpload()" title="Change photo">
              <span>📷</span>
              <span style="font-size:11px;font-weight:600">Change</span>
            </div>
            <input type="file" id="avatar-file-input" accept="image/*" style="display:none" onchange="ProfilePage.handleUpload(event)"/>
          </div>
          <div class="profile-card-name" id="prof-card-name">${p.name}</div>
          <div class="profile-card-sub" id="prof-card-sub">Year ${p.year} · ${p.program}</div>
          <div class="profile-card-id">${p.studentId}</div>
          <div class="profile-card-badges">
            <span class="profile-badge">🎓 Student</span>
            <span class="profile-badge">📚 Year ${p.year}</span>
          </div>
          ${p.avatar ? `<button class="btn-ghost-danger" style="margin-top:14px;width:100%" onclick="ProfilePage.removeAvatar()"><span>🗑</span> Remove Photo</button>` : ''}
        </div>

        <div class="profile-sections">
          <div class="settings-section">
            <h3>Personal Information</h3>
            <div class="form-row">
              <div class="form-group"><label>Full Name</label><input id="pf-name" value="${p.name}" placeholder="Your full name"/></div>
              <div class="form-group"><label>Student ID</label><input id="pf-id" value="${p.studentId}" readonly style="opacity:.55;cursor:not-allowed"/></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Email Address</label><input id="pf-email" type="email" value="${p.email}" placeholder="email@school.edu"/></div>
              <div class="form-group"><label>Phone</label><input id="pf-phone" value="${p.phone || ''}" placeholder="+212 6XX XXX XXX"/></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Program / Major</label><input id="pf-program" value="${p.program}" placeholder="Computer Science"/></div>
              <div class="form-group"><label>Year of Study</label>
                <select id="pf-year">
                  ${[1, 2, 3, 4, 5].map(y => `<option value="${y}" ${p.year == y ? 'selected' : ''}>${['1st', '2nd', '3rd', '4th', '5th'][y - 1]} Year</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group"><label>Bio / About</label>
              <textarea id="pf-bio" rows="3" placeholder="Write a short bio…">${p.bio || ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">
              <button class="btn-primary" onclick="ProfilePage.save()">
                <span class="btn-icon">💾</span> Save Changes
              </button>
            </div>
          </div>

          <div class="settings-section">
            <h3>Change Password</h3>
            <div class="form-row">
              <div class="form-group"><label>Current Password</label><input type="password" id="pf-pass-old" placeholder="••••••••"/></div>
              <div class="form-group"><label>New Password</label><input type="password" id="pf-pass-new" placeholder="Min. 4 characters"/></div>
            </div>
            <button class="btn-secondary" onclick="ProfilePage.changePassword()">
              <span class="btn-icon">🔒</span> Update Password
            </button>
          </div>
        </div>
      </div>`;
  },

  triggerUpload() { document.getElementById('avatar-file-input').click(); },

  handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { Toast.show('Image too large (max 3MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const p = Profile.get();
      Profile.save({ ...p, avatar: ev.target.result });
      this.render();
      Toast.show('Profile photo updated! ✓', 'success');
    };
    reader.readAsDataURL(file);
  },

  removeAvatar() {
    const p = Profile.get();
    Profile.save({ ...p, avatar: null });
    this.render();
    Toast.show('Profile photo removed', 'default');
  },

  save() {
    const name = (document.getElementById('pf-name').value || '').trim();
    const email = (document.getElementById('pf-email').value || '').trim();
    const phone = (document.getElementById('pf-phone').value || '').trim();
    const program = (document.getElementById('pf-program').value || '').trim();
    const year = parseInt(document.getElementById('pf-year').value) || 1;
    const bio = (document.getElementById('pf-bio').value || '').trim();

    App._clearFieldErrors();
    if (!name) { App._fieldError(document.getElementById('pf-name'), 'Name cannot be empty'); return; }
    if (!email || !Validate.email(email)) { App._fieldError(document.getElementById('pf-email'), 'Valid email required'); return; }

    const p = Profile.get();
    Profile.save({ ...p, name, email, phone, program, year, bio });
    this.render();
    Toast.show('Profile saved! ✓', 'success');
    Notif.add(`✏️ Profile updated: ${name}`);
    App.renderDashboard();
  },

  changePassword() {
    const oldP = document.getElementById('pf-pass-old').value;
    const newP = document.getElementById('pf-pass-new').value;

    App._clearFieldErrors();
    if (!oldP) { App._fieldError(document.getElementById('pf-pass-old'), 'Enter current password'); return; }
    if (!Validate.minLen(newP, 4)) { App._fieldError(document.getElementById('pf-pass-new'), 'Min. 4 characters'); return; }

    const p = Profile.get();
    const result = Auth.login(p.email, oldP);
    if (!result.success) { App._fieldError(document.getElementById('pf-pass-old'), 'Incorrect current password'); return; }

    Auth.updateAccount(p.email, { password: newP });
    document.getElementById('pf-pass-old').value = '';
    document.getElementById('pf-pass-new').value = '';
    Toast.show('Password updated successfully! ✓', 'success');
  }
};

// ── Grades ──
const Grades = {
  subjects: Store.get('subjects', []),
  grades: Store.get('grades', []),
  init() { this.render(); },
  getSubjectAverage(sid) {
    const g = this.grades.filter(x => x.subjectId === sid);
    if (!g.length) return null;
    const tw = g.reduce((s, x) => s + x.coef * x.grade, 0);
    const tc = g.reduce((s, x) => s + x.coef, 0);
    return tc ? tw / tc : null;
  },
  getGlobalAverage() {
    const avgs = this.subjects.map(s => ({ avg: this.getSubjectAverage(s.id), coef: s.coef || 1 }))
      .filter(x => x.avg !== null);
    if (!avgs.length) return null;
    const tw = avgs.reduce((s, x) => s + x.avg * x.coef, 0);
    const tc = avgs.reduce((s, x) => s + x.coef, 0);
    return tc ? tw / tc : null;
  },
  avgClass(avg) {
    if (avg === null) return '';
    if (avg >= 16) return 'avg-excellent';
    if (avg >= 12) return 'avg-good';
    if (avg >= 10) return 'avg-average';
    return 'avg-poor';
  },
  save() { Store.set('subjects', this.subjects); Store.set('grades', this.grades); },
  openAddSubject() {
    Modal.open('Add New Subject',
      `<div class="form-group"><label>Subject Name</label><input id="m-sn" placeholder="e.g. Mathematics"/></div>
       <div class="form-group"><label>Coefficient</label><input id="m-sc" type="number" min="1" max="10" value="1"/></div>`,
      () => {
        const name = (document.getElementById('m-sn').value || '').trim();
        const coef = parseFloat(document.getElementById('m-sc').value) || 1;
        if (!name) { Toast.show('Enter a subject name', 'error'); return; }
        if (this.subjects.find(s => s.name.toLowerCase() === name.toLowerCase())) {
          Toast.show('Subject already exists', 'error'); return;
        }
        this.subjects.push({ id: 'sub_' + Date.now(), name, coef, color: SUBJECT_COLORS[this.subjects.length % SUBJECT_COLORS.length] });
        this.save(); this.render(); App.renderDashboard();
        Modal.close(); Toast.show(`"${name}" added`, 'success');
        Notif.add(`📚 New subject: ${name}`);
      }
    );
  },
  openEditSubject(id) {
    const s = this.subjects.find(x => x.id === id); if (!s) return;
    Modal.open('Edit Subject',
      `<div class="form-group"><label>Subject Name</label><input id="m-sn" value="${s.name}"/></div>
       <div class="form-group"><label>Coefficient</label><input id="m-sc" type="number" min="1" max="10" value="${s.coef}"/></div>`,
      () => {
        const name = (document.getElementById('m-sn').value || '').trim();
        const coef = parseFloat(document.getElementById('m-sc').value) || 1;
        if (!name) return;
        s.name = name; s.coef = coef;
        this.save(); this.render(); App.renderDashboard();
        Modal.close(); Toast.show('Subject updated', 'success');
      }
    );
  },
  deleteSubject(id) {
    const s = this.subjects.find(x => x.id === id);
    Confirm.show({
      title: 'Delete subject?',
      message: `"${s?.name}" and all its grades will be permanently removed.`,
      confirmLabel: 'Delete',
      confirmClass: 'btn-ghost-danger',
      icon: '🗑',
      onConfirm: () => {
        this.subjects = this.subjects.filter(x => x.id !== id);
        this.grades = this.grades.filter(g => g.subjectId !== id);
        this.save(); this.render(); App.renderDashboard();
        Toast.show('Subject deleted', 'default');
      }
    });
  },
  openAddGrade(sid) {
    const s = this.subjects.find(x => x.id === sid);
    Modal.open(`Add Grade — ${s?.name}`,
      `<div class="form-group"><label>Title</label><input id="m-gt" placeholder="e.g. Midterm Exam"/></div>
       <div class="form-group"><label>Grade (0–20)</label><input id="m-gv" type="number" min="0" max="20" step="0.25"/></div>
       <div class="form-row">
         <div class="form-group"><label>Coefficient</label><input id="m-gc" type="number" min="0.5" step="0.5" value="1"/></div>
         <div class="form-group"><label>Date</label><input id="m-gd" type="date" value="${new Date().toISOString().split('T')[0]}"/></div>
       </div>`,
      () => {
        const title = (document.getElementById('m-gt').value || '').trim() || 'Grade';
        const grade = parseFloat(document.getElementById('m-gv').value);
        const coef = parseFloat(document.getElementById('m-gc').value) || 1;
        const date = document.getElementById('m-gd').value;
        if (isNaN(grade) || grade < 0 || grade > 20) { Toast.show('Grade must be 0–20', 'error'); return; }
        this.grades.push({ id: 'g_' + Date.now(), subjectId: sid, title, grade, coef, date });
        this.save(); this.render(); App.renderDashboard();
        Modal.close(); Toast.show(`${grade}/20 added to ${s?.name}`, 'success');
        const avg = this.getSubjectAverage(sid);
        if (avg !== null && avg < 10) Notif.add(`⚠️ Low average in ${s?.name}: ${avg.toFixed(1)}/20`);
      }
    );
  },
  deleteGrade(id) {
    Confirm.show({
      title: 'Remove grade?',
      message: 'This grade will be permanently deleted.',
      confirmLabel: 'Remove',
      confirmClass: 'btn-ghost-danger',
      icon: '🗑',
      onConfirm: () => {
        this.grades = this.grades.filter(g => g.id !== id);
        this.save(); this.render(); App.renderDashboard();
        Toast.show('Grade removed', 'default');
      }
    });
  },
  toggleExpand(sid) {
    document.getElementById('table-' + sid).classList.toggle('open');
  },
  render() {
    const c = document.getElementById('grades-container'); if (!c) return;
    const gavg = this.getGlobalAverage();
    const gad = document.getElementById('global-avg-display');
    if (gad) gad.textContent = gavg !== null ? gavg.toFixed(2) + '/20' : '—';

    if (!this.subjects.length) {
      c.innerHTML = `<div class="empty-state" style="padding:60px">
        <div class="es-icon" style="font-size:48px">◎</div>
        <p style="font-size:16px;margin-bottom:8px">No subjects yet</p>
        <p style="color:var(--text2)">Click "+ Add Subject" to get started</p></div>`;
      return;
    }
    c.innerHTML = this.subjects.map(sub => {
      const avg = this.getSubjectAverage(sub.id);
      const ac = this.avgClass(avg);
      const gs = this.grades.filter(g => g.subjectId === sub.id);
      return `<div class="subject-card">
        <div class="subject-card-header" onclick="Grades.toggleExpand('${sub.id}')">
          <div class="subject-color-dot" style="background:${sub.color}"></div>
          <span class="subject-name">${sub.name}</span>
          <span style="font-size:12px;color:var(--text2);margin-right:8px">Coef: ${sub.coef}</span>
          ${avg !== null
          ? `<span class="subject-avg-badge ${ac}">${avg.toFixed(2)}/20</span>`
          : `<span class="subject-avg-badge" style="background:var(--surface2);color:var(--text2)">No grades</span>`}
          <div class="subject-actions" onclick="event.stopPropagation()">
            <button class="btn-action btn-add-grade" onclick="Grades.openAddGrade('${sub.id}')">
              <span>+</span> Grade
            </button>
            <button class="btn-action btn-edit" onclick="Grades.openEditSubject('${sub.id}')">
              <span>✎</span> Edit
            </button>
            <button class="btn-action btn-del" onclick="Grades.deleteSubject('${sub.id}')">
              <span>🗑</span> Delete
            </button>
          </div>
        </div>
        <div class="grades-table-wrap" id="table-${sub.id}">
          ${!gs.length
          ? '<p style="color:var(--text2);font-size:13px;padding:16px 0">No grades yet — click "+ Grade" above.</p>'
          : `<table class="grades-table">
                <thead><tr><th>Title</th><th>Grade</th><th>Coef</th><th>Date</th><th></th></tr></thead>
                <tbody>${gs.map(g => `
                  <tr>
                    <td>${g.title}</td>
                    <td><span class="grade-val ${this.avgClass(g.grade)}">${g.grade}</span><span class="grade-20">/20</span></td>
                    <td>×${g.coef}</td>
                    <td>${g.date || '—'}</td>
                    <td>
                      <button class="btn-icon-del" onclick="Grades.deleteGrade('${g.id}')" title="Remove grade">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </td>
                  </tr>`).join('')}</tbody>
              </table>`}
        </div>
      </div>`;
    }).join('');
  },
  exportPDF() {
    const p = Profile.get();
    const gavg = this.getGlobalAverage();
    const rows = this.subjects.map(s => {
      const avg = this.getSubjectAverage(s.id);
      const gs = this.grades.filter(g => g.subjectId === s.id).map(g => `${g.title}: ${g.grade}/20 (×${g.coef})`).join(', ');
      return `${s.name.padEnd(25)} Avg: ${avg !== null ? avg.toFixed(2) : 'N/A'}/20   ${gs || 'No grades'}`;
    });
    const content = [
      '╔══════════════════════════════════╗',
      '║     ACADEMIQ — GRADE REPORT      ║',
      '╚══════════════════════════════════╝',
      `Student : ${p.name}`,
      `Program : ${p.program} — Year ${p.year}`,
      `ID      : ${p.studentId}`,
      `Date    : ${new Date().toLocaleDateString()}`,
      '─'.repeat(44),
      `Global Average: ${gavg !== null ? gavg.toFixed(2) : 'N/A'}/20`,
      '─'.repeat(44),
      ...rows,
      '─'.repeat(44),
    ].join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([content], { type: 'text/plain' })),
      download: 'AcademiQ_Grades.txt'
    });
    a.click();
    Toast.show('Grade report exported ✓', 'success');
  }
};

// ── Schedule ──
const Schedule = {
  classes: Store.get('schedule', [
    { id: 'sc1', day: 'Monday', time: '08:00', subject: 'Mathematics', room: 'B204', color: '#2A52CC' },
    { id: 'sc2', day: 'Monday', time: '10:00', subject: 'Physics', room: 'Lab A', color: '#6D2FCC' },
    { id: 'sc3', day: 'Tuesday', time: '09:00', subject: 'Computer Sci.', room: 'IT-01', color: '#1A7A50' },
    { id: 'sc4', day: 'Wednesday', time: '08:00', subject: 'Mathematics', room: 'B204', color: '#2A52CC' },
    { id: 'sc5', day: 'Wednesday', time: '14:00', subject: 'English', room: 'A101', color: '#C96A08' },
    { id: 'sc6', day: 'Thursday', time: '11:00', subject: 'Physics', room: 'Lab A', color: '#6D2FCC' },
    { id: 'sc7', day: 'Friday', time: '09:00', subject: 'Computer Sci.', room: 'IT-01', color: '#1A7A50' },
    { id: 'sc8', day: 'Friday', time: '13:00', subject: 'Statistics', room: 'C305', color: '#C42B2B' },
  ]),
  init() { this.render(); },
  save() { Store.set('schedule', this.classes); },
  openAdd() {
    const opts = [...new Set([...this.classes.map(c => c.subject), ...Grades.subjects.map(s => s.name)])]
      .map(n => `<option value="${n}">${n}</option>`).join('');
    Modal.open('Add Class',
      `<div class="form-group"><label>Subject</label>
         <select id="m-ss" onchange="document.getElementById('m-scw').style.display=this.value?'none':'block'">
           <option value="">— Custom name —</option>${opts}
         </select></div>
       <div class="form-group" id="m-scw" style="display:none">
         <label>Custom Name</label><input id="m-sc2" placeholder="Subject name"/></div>
       <div class="form-row">
         <div class="form-group"><label>Day</label>
           <select id="m-sd">${DAYS.map(d => `<option>${d}</option>`).join('')}</select></div>
         <div class="form-group"><label>Time</label>
           <select id="m-st">${HOURS.map(h => `<option>${h}</option>`).join('')}</select></div>
       </div>
       <div class="form-group"><label>Room / Location</label><input id="m-sr" placeholder="e.g. B204"/></div>
       <div class="form-group"><label>Color</label>
         <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
           ${SUBJECT_COLORS.map((c, i) =>
        `<label style="cursor:pointer">
               <input type="radio" name="sc-color" value="${c}" ${i === 0 ? 'checked' : ''} style="display:none"/>
               <span style="display:block;width:26px;height:26px;background:${c};border-radius:50%;border:3px solid transparent;transition:all .15s"
                 onclick="document.querySelectorAll('[name=sc-color]').forEach(r=>{r.nextElementSibling.style.borderColor='transparent'});
                          this.previousElementSibling.checked=true;this.style.borderColor='var(--text)'"></span>
             </label>`).join('')}
         </div></div>`,
      () => {
        const subj = document.getElementById('m-ss').value || (document.getElementById('m-sc2').value || '').trim();
        const day = document.getElementById('m-sd').value;
        const time = document.getElementById('m-st').value;
        const room = (document.getElementById('m-sr').value || '').trim() || '—';
        const colorEl = document.querySelector('input[name="sc-color"]:checked');
        const color = colorEl ? colorEl.value : SUBJECT_COLORS[0];
        if (!subj) { Toast.show('Enter a subject name', 'error'); return; }
        this.classes.push({ id: 'sc_' + Date.now(), day, time, subject: subj, room, color });
        this.save(); this.render(); App.renderDashboard();
        Modal.close(); Toast.show(`${subj} added on ${day}`, 'success');
      }
    );
  },
  deleteClass(id) {
    this.classes = this.classes.filter(c => c.id !== id);
    this.save(); this.render(); App.renderDashboard();
    Toast.show('Class removed', 'default');
  },
  render() {
    const grid = document.getElementById('schedule-grid'); if (!grid) return;
    const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    let html = `<div class="schedule-header" style="font-size:11px;color:var(--text3)">Time</div>`;
    DAYS.forEach(d => {
      html += `<div class="schedule-header ${d === todayName ? 'today' : ''}">${d}<br><span style="font-size:10px;opacity:.6">${d === todayName ? 'Today' : ''}</span></div>`;
    });
    HOURS.forEach(h => {
      html += `<div class="schedule-time-slot"><div class="time-label">${h}</div></div>`;
      DAYS.forEach(day => {
        const cls = this.classes.filter(c => c.day === day && c.time === h);
        html += `<div class="schedule-time-slot">${cls.map(c =>
          `<div class="schedule-class" style="background:${c.color}18;border-left-color:${c.color};color:${c.color}">
            <div class="sc-name">${c.subject}</div>
            <div class="sc-room">${c.room}</div>
            <button onclick="event.stopPropagation();Schedule.deleteClass('${c.id}')"
              style="font-size:10px;margin-top:4px;opacity:.6;color:${c.color};cursor:pointer;display:flex;align-items:center;gap:3px;padding:2px 4px;border-radius:3px;border:1px solid ${c.color}40;background:${c.color}10">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> remove
            </button>
          </div>`).join('')}</div>`;
      });
    });
    grid.innerHTML = html;
  }
};

// ── Tasks ──
const Tasks = {
  tasks: Store.get('tasks', [
    { id: 't1', title: 'Calculus Problem Set 3', subject: 'Mathematics', due: '2025-01-20', priority: 'high', completed: false },
    { id: 't2', title: 'Lab Report — Optics', subject: 'Physics', due: '2025-01-18', priority: 'medium', completed: false },
    { id: 't3', title: 'Algorithm Project Ph.2', subject: 'Comp. Sci.', due: '2025-01-25', priority: 'high', completed: false },
    { id: 't4', title: 'Read Chapter 7', subject: 'English', due: '2025-01-15', priority: 'low', completed: true },
  ]),
  filter: 'all',
  init() { this.render(); },
  save() { Store.set('tasks', this.tasks); },
  openAdd() {
    const opts = Grades.subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    Modal.open('Add New Task',
      `<div class="form-group"><label>Task Title</label><input id="m-tt" placeholder="e.g. Complete homework"/></div>
       <div class="form-group"><label>Subject (optional)</label>
         <select id="m-ts"><option value="">— None —</option>${opts}</select></div>
       <div class="form-row">
         <div class="form-group"><label>Due Date</label><input id="m-td" type="date"/></div>
         <div class="form-group"><label>Priority</label>
           <select id="m-tp">
             <option value="low">🟢 Low</option>
             <option value="medium" selected>🟡 Medium</option>
             <option value="high">🔴 High</option>
           </select></div>
       </div>`,
      () => {
        const title = (document.getElementById('m-tt').value || '').trim();
        if (!title) { Toast.show('Enter a task title', 'error'); return; }
        const task = {
          id: 't_' + Date.now(), title,
          subject: document.getElementById('m-ts').value,
          due: document.getElementById('m-td').value,
          priority: document.getElementById('m-tp').value,
          completed: false
        };
        this.tasks.unshift(task);
        this.save(); this.render(); App.renderDashboard();
        Modal.close(); Toast.show('Task added', 'success');
        if (task.priority === 'high') Notif.add(`🔴 High priority: ${title}`);
      }
    );
  },
  toggle(id) {
    const t = this.tasks.find(x => x.id === id); if (!t) return;
    t.completed = !t.completed;
    this.save(); this.render(); App.renderDashboard();
    if (t.completed) { Toast.show('Task completed! ✓', 'success', 2000); Notif.add(`✅ Completed: ${t.title}`); }
  },
  delete(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.save(); this.render(); App.renderDashboard();
    Toast.show('Task removed', 'default');
  },
  setFilter(f, el) {
    this.filter = f;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    this.render();
  },
  render() {
    const c = document.getElementById('tasks-container'); if (!c) return;
    const today = new Date().toISOString().split('T')[0];
    let filtered = this.tasks;
    if (this.filter === 'pending') filtered = filtered.filter(t => !t.completed);
    if (this.filter === 'completed') filtered = filtered.filter(t => t.completed);
    if (this.filter === 'high') filtered = filtered.filter(t => t.priority === 'high' && !t.completed);

    const pending = this.tasks.filter(t => !t.completed).length;
    const done = this.tasks.filter(t => t.completed).length;
    const summ = document.getElementById('tasks-summary');
    if (summ) summ.textContent = `${pending} pending · ${done} completed`;

    if (!filtered.length) {
      c.innerHTML = `<div class="empty-state" style="padding:60px">
        <div class="es-icon" style="font-size:48px">◉</div>
        <p style="font-size:16px;margin-bottom:8px">${this.filter === 'all' ? 'No tasks yet' : 'No tasks here'}</p>
        <p style="color:var(--text2)">Click "+ Add Task" to get started</p></div>`;
      return;
    }
    c.innerHTML = filtered.map(t => {
      const overdue = t.due && t.due < today && !t.completed;
      const pc = { high: 'priority-high', medium: 'priority-medium', low: 'priority-low' }[t.priority] || '';
      return `<div class="task-item ${t.completed ? 'completed' : ''}">
        <div class="task-check" onclick="Tasks.toggle('${t.id}')" title="${t.completed ? 'Mark incomplete' : 'Mark complete'}">${t.completed ? '✓' : ''}</div>
        <div class="task-content">
          <div class="task-title">${t.title}</div>
          <div class="task-meta">
            ${t.subject ? `<span class="task-subject">📚 ${t.subject}</span>` : ''}
            ${t.due ? `<span class="task-due ${overdue ? 'overdue' : ''}">${overdue ? '⚠ Overdue · ' : ''}📅 ${t.due}</span>` : ''}
            <span class="task-priority ${pc}">${t.priority}</span>
          </div>
        </div>
        <button class="btn-icon-del" onclick="Tasks.delete('${t.id}')" title="Remove task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>`;
    }).join('');
  }
};

// ── Absences ──
const Absences = {
  absences: Store.get('absences', [
    { id: 'a1', subject: 'Mathematics', date: '2024-11-12', justified: true, note: 'Doctor appointment' },
    { id: 'a2', subject: 'Physics', date: '2024-11-20', justified: false, note: '' },
    { id: 'a3', subject: 'English', date: '2024-12-01', justified: true, note: 'Family event' },
  ]),
  init() { this.render(); },
  save() { Store.set('absences', this.absences); },
  openAdd() {
    const opts = Grades.subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    Modal.open('Log Absence',
      `<div class="form-group"><label>Subject</label>
         <select id="m-as"><option value="">— Select subject —</option>${opts}<option value="Other">Other</option></select></div>
       <div class="form-row">
         <div class="form-group"><label>Date</label>
           <input id="m-ad" type="date" value="${new Date().toISOString().split('T')[0]}"/></div>
         <div class="form-group"><label>Status</label>
           <select id="m-aj"><option value="false">🔴 Unjustified</option><option value="true">🟢 Justified</option></select></div>
       </div>
       <div class="form-group"><label>Note (optional)</label>
         <textarea id="m-an" placeholder="Reason for absence…"></textarea></div>`,
      () => {
        const subject = document.getElementById('m-as').value;
        if (!subject) { Toast.show('Select a subject', 'error'); return; }
        const abs = {
          id: 'a_' + Date.now(), subject,
          date: document.getElementById('m-ad').value,
          justified: document.getElementById('m-aj').value === 'true',
          note: (document.getElementById('m-an').value || '').trim()
        };
        this.absences.unshift(abs);
        this.save(); this.render(); App.renderDashboard();
        Modal.close();
        Toast.show('Absence logged', abs.justified ? 'default' : 'warning');
        if (!abs.justified) Notif.add(`⚠️ Unjustified absence: ${subject}`);
      }
    );
  },
  delete(id) {
    Confirm.show({
      title: 'Remove absence?',
      message: 'This attendance record will be permanently deleted.',
      confirmLabel: 'Remove',
      confirmClass: 'btn-ghost-danger',
      icon: '📋',
      onConfirm: () => {
        this.absences = this.absences.filter(a => a.id !== id);
        this.save(); this.render(); App.renderDashboard();
        Toast.show('Absence removed', 'default');
      }
    });
  },
  render() {
    const se = document.getElementById('absence-summary');
    const c = document.getElementById('absences-container');
    if (!se || !c) return;
    const total = this.absences.length;
    const just = this.absences.filter(a => a.justified).length;
    const unjust = total - just;
    se.innerHTML = `
      <div class="abs-card abs-total"><div class="abs-num">${total}</div><div class="abs-label">Total Absences</div></div>
      <div class="abs-card abs-justified"><div class="abs-num">${just}</div><div class="abs-label">Justified</div></div>
      <div class="abs-card abs-unjustified"><div class="abs-num">${unjust}</div><div class="abs-label">Unjustified</div></div>`;
    if (!total) {
      c.innerHTML = '<div class="empty-state" style="padding:60px"><div class="es-icon" style="font-size:48px">◌</div><p style="font-size:16px">Perfect attendance! 🎉</p></div>';
      return;
    }
    c.innerHTML = [...this.absences].sort((a, b) => b.date.localeCompare(a.date)).map(a =>
      `<div class="absence-item">
        <div class="abs-status-dot" style="background:${a.justified ? 'var(--green)' : 'var(--red)'}"></div>
        <div class="abs-info">
          <div class="abs-subject">${a.subject}</div>
          <div class="abs-date">${a.date}${a.note ? ' · ' + a.note : ''}</div>
        </div>
        <span class="abs-tag ${a.justified ? 'abs-justified-tag' : 'abs-unjustified-tag'}">${a.justified ? 'Justified' : 'Unjustified'}</span>
        <button class="btn-icon-del" onclick="Absences.delete('${a.id}')" title="Remove absence">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>`).join('');
  }
};

// ── Statistics ──
const Statistics = {
  render() {
    const c = document.getElementById('statistics-container'); if (!c) return;
    const avgs = Grades.subjects.map(s => ({ name: s.name, avg: Grades.getSubjectAverage(s.id), color: s.color }));
    const gavg = Grades.getGlobalAverage();
    const tasks = Tasks.tasks;
    const done = tasks.filter(t => t.completed).length;
    const taskPct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    const absTotal = Absences.absences.length;
    const absJust = Absences.absences.filter(a => a.justified).length;
    const attPct = Math.max(0, Math.round((1 - absTotal / 80) * 100));

    const bars = avgs.length
      ? avgs.map(s => `<div class="chart-bar-row">
          <div class="cbr-label">${s.name}</div>
          <div class="cbr-track"><div class="cbr-fill" style="width:${s.avg !== null ? (s.avg / 20 * 100) : 0}%;background:${s.color}"></div></div>
          <div class="cbr-value" style="color:${s.color}">${s.avg !== null ? s.avg.toFixed(1) : '—'}</div>
        </div>`).join('')
      : '<p style="color:var(--text2);font-size:13px">Add subjects and grades to see stats</p>';

    const r = 44, C = 2 * Math.PI * r;
    const td = `${taskPct / 100 * C} ${C}`;
    const ad = `${attPct / 100 * C} ${C}`;

    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
    const base = gavg !== null ? gavg : 13;
    const trend = [base - 2.1, base - 1.5, base - 0.8, base, base + 0.5, null].map(v => v !== null ? Math.max(0, Math.min(20, v)) : null);
    const maxT = Math.max(...trend.filter(Boolean));
    const tBars = trend.map((v, i) => v !== null
      ? `<div class="tc-bar" title="${months[i]}: ${v.toFixed(1)}" style="height:${v / maxT * 100}%"></div>`
      : `<div class="tc-bar" style="height:4px;opacity:.2;background:var(--text3)" title="In progress"></div>`
    ).join('');

    c.innerHTML = `
      <div class="stats-grid">
        <div class="stats-panel full"><h3>Subject Averages</h3><div class="chart-bar-container">${bars}</div></div>
        <div class="stats-panel">
          <h3>Task Completion</h3>
          <div class="donut-container">
            <div class="donut-wrap">
              <svg class="donut-svg" viewBox="0 0 100 100">
                <circle class="donut-track" cx="50" cy="50" r="${r}"/>
                <circle class="donut-fill" cx="50" cy="50" r="${r}" stroke="var(--accent)" stroke-dasharray="${td}"/>
              </svg>
              <div class="donut-text"><span class="donut-pct">${taskPct}%</span><span class="donut-sub">Done</span></div>
            </div>
            <div class="donut-legend">
              <div class="dl-item"><div class="dl-dot" style="background:var(--accent)"></div><span class="dl-label">Completed</span><span class="dl-val">${done}</span></div>
              <div class="dl-item"><div class="dl-dot" style="background:var(--border)"></div><span class="dl-label">Pending</span><span class="dl-val">${tasks.length - done}</span></div>
              <div class="dl-item"><div class="dl-dot" style="background:var(--text2)"></div><span class="dl-label">Total</span><span class="dl-val">${tasks.length}</span></div>
            </div>
          </div>
        </div>
        <div class="stats-panel">
          <h3>Attendance Rate</h3>
          <div class="donut-container">
            <div class="donut-wrap">
              <svg class="donut-svg" viewBox="0 0 100 100">
                <circle class="donut-track" cx="50" cy="50" r="${r}"/>
                <circle class="donut-fill" cx="50" cy="50" r="${r}" stroke="var(--green)" stroke-dasharray="${ad}"/>
              </svg>
              <div class="donut-text"><span class="donut-pct">${attPct}%</span><span class="donut-sub">Present</span></div>
            </div>
            <div class="donut-legend">
              <div class="dl-item"><div class="dl-dot" style="background:var(--green)"></div><span class="dl-label">Justified</span><span class="dl-val">${absJust}</span></div>
              <div class="dl-item"><div class="dl-dot" style="background:var(--red)"></div><span class="dl-label">Unjustified</span><span class="dl-val">${absTotal - absJust}</span></div>
              <div class="dl-item"><div class="dl-dot" style="background:var(--text2)"></div><span class="dl-label">Total</span><span class="dl-val">${absTotal}</span></div>
            </div>
          </div>
        </div>
        <div class="stats-panel full">
          <h3>Academic Progress Trend</h3>
          <div style="padding:12px 0">
            <div class="trend-chart">${tBars}</div>
            <div class="trend-labels">${months.map(m => `<div class="tc-label">${m}</div>`).join('')}</div>
          </div>
          <p style="font-size:12px;color:var(--text2);margin-top:8px">
            Current average: <strong>${gavg !== null ? gavg.toFixed(2) + '/20' : 'N/A'}</strong>
            ${gavg !== null ? ' · ' + (gavg >= 14 ? '🎉 Excellent!' : gavg >= 10 ? '📈 Keep it up!' : '📚 Needs improvement') : ''}
          </p>
        </div>
      </div>`;
  }
};

// ── Settings ──
const Settings = {
  prefs: Store.get('prefs', { notifications: true, animations: true, compactMode: false, showAvgBadge: true }),
  save() { Store.set('prefs', this.prefs); },
  toggle(key) { this.prefs[key] = !this.prefs[key]; this.save(); Toast.show('Preference saved', 'default', 1500); },
  render() {
    const c = document.getElementById('settings-container'); if (!c) return;
    const p = this.prefs;
    c.innerHTML = `
      <div class="settings-sections">
        <div class="settings-section">
          <h3>Appearance</h3>
          <div class="setting-row">
            <div class="setting-info"><div class="setting-name">Dark Mode</div><div class="setting-desc">Switch between light and dark theme</div></div>
            <label class="toggle-switch"><input type="checkbox" ${App.theme === 'dark' ? 'checked' : ''} onchange="App.toggleTheme();Settings.render()"/><div class="toggle-slider"></div></label>
          </div>
          <div class="setting-row">
            <div class="setting-info"><div class="setting-name">Animations</div><div class="setting-desc">Enable smooth transitions</div></div>
            <label class="toggle-switch"><input type="checkbox" ${p.animations ? 'checked' : ''} onchange="Settings.toggle('animations')"/><div class="toggle-slider"></div></label>
          </div>
          <div class="setting-row">
            <div class="setting-info"><div class="setting-name">Compact Mode</div><div class="setting-desc">Reduce padding for denser view</div></div>
            <label class="toggle-switch"><input type="checkbox" ${p.compactMode ? 'checked' : ''} onchange="Settings.toggle('compactMode')"/><div class="toggle-slider"></div></label>
          </div>
        </div>
        <div class="settings-section">
          <h3>Notifications</h3>
          <div class="setting-row">
            <div class="setting-info"><div class="setting-name">Enable Notifications</div><div class="setting-desc">Get alerts for grades, tasks, absences</div></div>
            <label class="toggle-switch"><input type="checkbox" ${p.notifications ? 'checked' : ''} onchange="Settings.toggle('notifications')"/><div class="toggle-slider"></div></label>
          </div>
          <div class="setting-row">
            <div class="setting-info"><div class="setting-name">Show Average Badge</div><div class="setting-desc">Display current average in grades header</div></div>
            <label class="toggle-switch"><input type="checkbox" ${p.showAvgBadge ? 'checked' : ''} onchange="Settings.toggle('showAvgBadge')"/><div class="toggle-slider"></div></label>
          </div>
        </div>
        <div class="settings-section">
          <h3>Data Management</h3>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn-secondary" onclick="Grades.exportPDF()">
              <span class="btn-icon">⬇</span> Export Grades
            </button>
            <button class="btn-secondary" onclick="Settings.exportAll()">
              <span class="btn-icon">📦</span> Export All Data
            </button>
            <button class="btn-ghost-danger" onclick="Settings.clearData()">
              <span class="btn-icon">🗑</span> Reset All Data
            </button>
          </div>
          <p style="margin-top:12px;font-size:12px;color:var(--text2)">All data is stored locally in your browser.</p>
        </div>
        <div class="settings-section about-dev-section">
  <div class="about-dev-grid">

    <div class="about-dev-content">
      <div class="about-badge">Developer Profile</div>

      <h3 class="about-dev-title">
        About AcademiQ
      </h3>

      <p class="about-dev-text">
        AcademiQ v4.0 — Smart Student Dashboard designed with a modern UI/UX experience.
        Built using vanilla HTML, CSS & JavaScript with smooth animations and responsive layouts.
      </p>

      <div class="developer-card">

        <div class="developer-top">
          <div class="developer-image-wrap">

            <img src="ana.JPG"
            alt="Developer"
            class="developer-image">

          </div>

          <div class="developer-info">
            <h4>Ilias Benazzouza</h4>
            <span>Frontend & Full Stack Developer</span>
          </div>
        </div>

        <div class="developer-desc">
          Passionate about creating elegant dashboards,
          modern interfaces and premium web experiences.
        </div>

        <div class="developer-socials">

          <a href="https://wa.me/212769908707"
             target="_blank"
             class="social-btn social-whatsapp">

            <i class="fab fa-whatsapp"></i>

          </a>

          <a href="https://www.instagram.com/iliass____ben/?hl=en"
             target="_blank"
             class="social-btn social-instagram">

            <i class="fab fa-instagram"></i>

          </a>

          <a href="https://www.linkedin.com/in/ilias-benazzouza-b47461402/"
             target="_blank"
             class="social-btn social-linkedin">

            <i class="fab fa-linkedin-in"></i>

          </a>

          <a href="https://github.com/iliassben809"
             target="_blank"
             class="social-btn social-github">

            <i class="fab fa-github"></i>

          </a>

        </div>

      </div>
    </div>

  </div>
</div>
      </div>`;
  },
  exportAll() {
    const data = {
      profile: Profile.get(), subjects: Grades.subjects, grades: Grades.grades,
      tasks: Tasks.tasks, schedule: Schedule.classes, absences: Absences.absences,
      exported: new Date().toISOString()
    };
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
      download: 'AcademiQ_backup.json'
    });
    a.click(); Toast.show('Full backup exported', 'success');
  },
  clearData() {
    Confirm.show({
      title: 'Reset all data?',
      message: 'All grades, tasks, schedule, and absences will be permanently deleted. This cannot be undone.',
      confirmLabel: 'Reset Everything',
      confirmClass: 'btn-ghost-danger',
      icon: '⚠️',
      onConfirm: () => {
        ['subjects', 'grades', 'tasks', 'schedule', 'absences', 'notifications', 'prefs']
          .forEach(k => Store.remove(k));
        location.reload();
      }
    });
  }
};

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => {
  const theme = Store.get('theme', 'light');
  document.documentElement.setAttribute('data-theme', theme);
  App.theme = theme;
  ['theme-icon', 'login-theme-icon'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = theme === 'dark' ? '☽' : '☀';
  });

  // Check for existing session → auto-login
  if (Auth.isLoggedIn()) {
    const account = Auth.getSession();
    if (account) {
      document.getElementById('login-page').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      App.init();
      return;
    } else {
      // Session email no longer has account, clear it
      Auth.clearSession();
    }
  }

  // Prefill email if remembered
  const sessionEmail = Store.get('session_email');
  const remembered = Store.get('session_remember');
  if (sessionEmail && remembered) {
    document.getElementById('login-email').value = sessionEmail;
  }
});
