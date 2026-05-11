// Конфігурація
const API = '';

// Стан
const state = {
    auth: {
        token: localStorage.getItem('token'),
        user: JSON.parse(localStorage.getItem('user') || 'null')
    },
    ui: {
        currentPage: 'landing',
        autosaveTimer: null
    },
    resume: {
        currentId: null,
        template: 'classic',
        photo: null,
        data: {
            personal: { firstName: '', lastName: '', jobTitle: '', email: '', phone: '', city: '', linkedin: '' },
            summary: '',
            experience: [],
            education: [],
            skills: [],
            languages: [],
            projects: [],
            links: { github: '', website: '', telegram: '' }
        }
    }
};

// API
async function api(method, path, body = null, raw = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.auth.token) headers['Authorization'] = `Bearer ${state.auth.token}`;

    const res = await fetch(API + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });

    if (raw) return res;

    let json = null;
    try { json = await res.json(); } catch { throw new Error('Невалідна відповідь сервера'); }
    if (!res.ok) throw new Error(json?.error || 'Помилка сервера');
    return json.data;
}

// Утиліти
function $(selector) { return document.querySelector(selector); }

function esc(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Тости
function toast(msg, type = '') {
    const wrap = document.getElementById('toasts');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`.trim();
    const icons = { ok: '✓', warn: '⚠', bad: '✕' };
    el.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${esc(msg)}`;
    wrap.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(20px)';
        setTimeout(() => el.remove(), 300);
    }, 3500);
}

// Модальні вікна
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function showConfirm(title, text, onOk) {
    const overlay = document.getElementById('mConfirm');
    const titleEl = document.getElementById('confirmTitle');
    const textEl = document.getElementById('confirmText');
    const okBtn = document.getElementById('confirmOk');

    if (!overlay || !titleEl || !textEl || !okBtn) {
        if (confirm(title + '\n' + text)) onOk();
        return;
    }

    titleEl.textContent = title;
    textEl.textContent = text;
    okBtn.onclick = () => {
        overlay.classList.remove('open');
        onOk();
    };
    overlay.classList.add('open');
}

function closeConfirm() {
    document.getElementById('mConfirm')?.classList.remove('open');
}

document.addEventListener('click', e => {
    if (e.target.classList.contains('overlay')) e.target.classList.remove('open');
});

// Guard
function requireAuth() {
    if (!state.auth.token) { openModal('mLogin'); return false; }
    return true;
}

// Навігація
function navigate(page, btn) {
    if (!document.getElementById(`page-${page}`)) return;

    const guarded = ['dashboard', 'analysis', 'editor'];
    if (guarded.includes(page) && !requireAuth()) return;

    state.ui.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
    (btn || document.querySelector(`.nav-link[data-page="${page}"]`))?.classList.add('active');

    if (page === 'dashboard') loadDashboard?.();
    if (page === 'analysis') loadAnalysisResumes?.();
    if (page === 'templates') {
        if (typeof syncTemplateSelection === 'function') syncTemplateSelection();
        if (typeof renderTemplateCards === 'function') renderTemplateCards();
    }
    if (page === 'editor') {
        if (typeof togglePhotoField === 'function') togglePhotoField();
        if (typeof updatePreview === 'function') updatePreview();
    }
    if (typeof updateEditorTemplateLbl === 'function') updateEditorTemplateLbl();
}

// Ініціалізація
(function init() {
    if (state.auth.token && state.auth.user) {
        setAuthState(state.auth.token, state.auth.user);
        api('GET', '/auth/me').catch(() => {
            clearAuthState();
            toast('Сесія закінчилась, увійдіть знову', 'warn');
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.overlay.open').forEach(m => m.classList.remove('open'));
        }
    });

    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.page, btn));
    });
})();