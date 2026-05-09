// Форми, прев'ю, прогрес, автозбереження, sidebar-resizer
function toggle(el, show) {
    if (!el) return;
    el.style.display = show ? '' : 'none';
}

function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

const SINGLE_COL_TEMPLATES = ['minimalist', 'professional', 'elegant', 'creative'];
function isSingleCol() { return SINGLE_COL_TEMPLATES.includes(state.resume.template); }

// Форми
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val || ''; }
function getVal(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

function fillForms() {
    const p = state.resume.data.personal;
    setVal('f-firstName', p.firstName); setVal('f-lastName', p.lastName);
    setVal('f-jobTitle', p.jobTitle); setVal('f-email', p.email);
    setVal('f-phone', p.phone); setVal('f-city', p.city);
    setVal('f-linkedin', p.linkedin); setVal('f-summary', state.resume.data.summary);
    setVal('f-github', state.resume.data.links.github);
    setVal('f-website', state.resume.data.links.website);
    setVal('f-telegram', state.resume.data.links.telegram);
    renderExpList(); renderEduList(); renderLangList(); renderProjList(); renderSkillTags();
    updatePreview(); updateProgress();
}

function readForms() {
    state.resume.data.personal = {
        firstName: getVal('f-firstName'), lastName: getVal('f-lastName'),
        jobTitle: getVal('f-jobTitle'), email: getVal('f-email'),
        phone: getVal('f-phone'), city: getVal('f-city'),
        linkedin: getVal('f-linkedin')
    };
    state.resume.data.summary = getVal('f-summary');
    state.resume.data.links = { github: getVal('f-github'), website: getVal('f-website'), telegram: getVal('f-telegram') };
}

// Автозбереження
const debouncedUpdate = debounce(() => { readForms(); updatePreview(); updateProgress(); scheduleAutosave(); }, 300);
function onFormInput() { debouncedUpdate(); }

function scheduleAutosave() {
    clearTimeout(state.ui.autosaveTimer);
    setStatus('збереження...');
    state.ui.autosaveTimer = setTimeout(autosave, 1200);
}

async function autosave() {
    if (!state.resume.currentId || !state.auth.token) return;
    try {
        const titleEl = document.getElementById('resumeTitle');
        if (state.resume.photo) { state.resume.data.photo = state.resume.photo; }
        else { delete state.resume.data.photo; }
        await api('PATCH', '/resumes/' + state.resume.currentId, {
            title: titleEl ? (titleEl.value.trim() || 'Нове резюме') : 'Нове резюме',
            template: state.resume.template, data: state.resume.data
        });
        setStatus('збережено', true);
    } catch { setStatus('помилка збереження'); }
}

function setStatus(text, ok = false) {
    const el = document.getElementById('saveStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'save-status' + (ok ? ' saved' : '');
}

// Секції
function switchSec(item, name) {
    document.querySelectorAll('.sec-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.form-sec').forEach(f => f.classList.remove('active'));
    document.getElementById('form-' + name)?.classList.add('active');
}

// Досвід
function addExp() {
    state.resume.data.experience.push({ position: '', company: '', startDate: '', endDate: '', current: false, description: '' });
    renderExpList(); onFormInput();
}
function removeExp(i) { state.resume.data.experience.splice(i, 1); renderExpList(); onFormInput(); }
function updateExp(i, field, value) {
    state.resume.data.experience[i][field] = value;
    if (field === 'current') renderExpList();
    onFormInput();
}

// Освіта
function addEdu() {
    state.resume.data.education.push({ institution: '', degree: '', field: '', startYear: '', endYear: '' });
    renderEduList(); onFormInput();
}
function removeEdu(i) { state.resume.data.education.splice(i, 1); renderEduList(); onFormInput(); }
function updateEdu(i, field, value) { state.resume.data.education[i][field] = value; onFormInput(); }

// Навички
function addSkillTag(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const inp = document.getElementById('skillInput');
    const val = inp.value.trim();
    if (!val || state.resume.data.skills.includes(val)) { inp.value = ''; return; }
    state.resume.data.skills.push(val);
    inp.value = '';
    renderSkillTags(); onFormInput();
}

function removeSkill(i) { state.resume.data.skills.splice(i, 1); renderSkillTags(); onFormInput(); }

// Мови
function addLang() {
    state.resume.data.languages.push({ language: '', level: 'B1' });
    renderLangList(); onFormInput();
}
function removeLang(i) { state.resume.data.languages.splice(i, 1); renderLangList(); onFormInput(); }
function updateLang(i, field, value) { state.resume.data.languages[i][field] = value; onFormInput(); }

// Проєкти
function addProj() {
    state.resume.data.projects.push({ name: '', url: '', description: '' });
    renderProjList(); onFormInput();
}
function removeProj(i) { state.resume.data.projects.splice(i, 1); renderProjList(); onFormInput(); }
function updateProj(i, field, value) { state.resume.data.projects[i][field] = value; onFormInput(); }

// Прогрес
function updateProgress() {
    const p = state.resume.data;
    const checks = [
        p.personal.firstName && p.personal.lastName, p.personal.email,
        p.summary.trim().length > 0,
        p.experience.some(e => e.position.trim() !== ''),
        p.education.some(e => e.institution.trim() !== '' || e.degree.trim() !== ''),
        p.skills.length > 0, p.languages.length > 0, !!state.resume.photo
    ];
    const pct = Math.round(checks.filter(Boolean).length / checks.length * 100);

    const ringFill = document.getElementById('ringFill');
    const ringPct = document.getElementById('ringPct');
    const ringSub = document.getElementById('ringSub');
    if (ringFill) ringFill.style.strokeDashoffset = String(113.1 - 113.1 * pct / 100);
    if (ringPct) ringPct.textContent = pct + '%';

    const hints = [];
    if (!p.personal.firstName || !p.personal.lastName) hints.push("ім'я");
    if (!p.personal.email) hints.push('email');
    if (!p.summary) hints.push('профіль');
    if (!p.experience.length) hints.push('досвід');
    if (!p.skills.length) hints.push('навички');
    if (!state.resume.photo) hints.push('фото');
    if (ringSub) ringSub.textContent = hints.length ? 'Додайте: ' + hints.slice(0, 3).join(', ') : 'Профіль повний ✓';

    const secChecks = {
        personal: p.personal.firstName && p.personal.email,
        summary: !!p.summary.trim(),
        experience: p.experience.some(e => e.position),
        education: p.education.some(e => e.institution || e.degree),
        skills: p.skills.length > 0,
        languages: p.languages.length > 0,
        projects: p.projects.length > 0,
        links: Object.values(p.links).some(v => v)
    };
    for (const [sec, ok] of Object.entries(secChecks)) {
        const el = document.getElementById('chk-' + sec);
        if (el) el.textContent = ok ? '✓' : '';
    }
}

function buildSkillsHTML() {
    const skills = state.resume.data.skills;
    if (!skills.length) return '';
    return skills.slice(0, 12).map(sk => `<span class="a4-skill-pill">${esc(sk)}</span>`).join('');
}

function buildLangsHTML() {
    const langs = state.resume.data.languages;
    if (!langs.length) return '';

    const levelToPercent = {
        'A1': 15, 'A2': 30, 'B1': 50, 'B2': 70, 'C1': 85, 'C2': 100
    };

    if (state.resume.template === 'creative') {
        return langs.map(l => {
            const percent = levelToPercent[l.level] || 50;
            const color = percent >= 90 ? '#2A7A5E' : percent >= 70 ? '#2563EB' : percent >= 50 ? '#C47B3A' : '#C94040';
            return `<div class="a4-lang">
                    <span class="a4-lang-name">${esc(l.language)}</span>
                    <div class="a4-lang-bar-wrap">
                        <div class="a4-lang-bar"><div class="a4-lang-fill" style="width:${percent}%; background:${color}"></div></div>
                        <span class="a4-lang-lvl">${esc(l.level)}</span>
                    </div>
                </div>`;
        }).join('');
    }

    return langs.map(l =>
        `<div class="a4-lang"><span class="a4-lang-name">${esc(l.language)}</span><span class="a4-lang-lvl">${esc(l.level)}</span></div>`
    ).join('');
}

function buildLinksHTML() {
    return Object.entries(state.resume.data.links).filter(([, v]) => v).map(([k, v]) =>
        `<div class="a4-link-item"><span class="a4-link-key">${esc(k)}</span><a class="a4-link-val" href="${esc(v)}" target="_blank">${esc(v)}</a></div>`
    ).join('');
}

// Прев'ю
function updatePreview() {
    const p = state.resume.data.personal;
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || "Ім'я Прізвище";
    const pvName = document.getElementById('pvName');
    const pvRole = document.getElementById('pvRole');
    if (pvName) pvName.textContent = name;
    if (pvRole) pvRole.textContent = p.jobTitle || 'Посада';

    // Контакти
    const contactItems = [
        p.email && p.email.trim() && { icon: '📧', val: p.email.trim() },
        p.phone && p.phone.trim() && { icon: '📱', val: p.phone.trim() },
        p.city && p.city.trim() && { icon: '📍', val: p.city.trim() },
        p.linkedin && p.linkedin.trim() && { icon: '🔗', val: p.linkedin.trim() }
    ].filter(Boolean);
    const pvContacts = document.getElementById('pvContacts');
    if (pvContacts) {
        pvContacts.innerHTML = contactItems.map(({ icon, val }) => `<span class="a4-contact">${esc(icon + ' ' + val)}</span>`).join('');
        toggle(pvContacts, contactItems.length > 0);
    }

    const singleCol = isSingleCol();

    // Ліва панель (тільки для двоколонкових)
    const pvSkillsSec = document.getElementById('pvSkillsSec');
    const pvLangsSec = document.getElementById('pvLangsSec');
    const pvLinksSec = document.getElementById('pvLinksSec');
    if (!singleCol) {
        const skEl = document.getElementById('pvSkills');
        if (skEl) skEl.innerHTML = buildSkillsHTML();
        toggle(pvSkillsSec, state.resume.data.skills.length > 0);

        const lnEl = document.getElementById('pvLangs');
        if (lnEl) lnEl.innerHTML = buildLangsHTML();
        toggle(pvLangsSec, state.resume.data.languages.length > 0);

        const lkEl = document.getElementById('pvLinks');
        if (lkEl) lkEl.innerHTML = buildLinksHTML();
        toggle(pvLinksSec, Object.values(state.resume.data.links).some(v => v));
    } else {
        toggle(pvSkillsSec, false);
        toggle(pvLangsSec, false);
        toggle(pvLinksSec, false);
    }

    // Правий блок — завжди
    const pvAbout = document.getElementById('pvAbout');
    const pvAboutSec = document.getElementById('pvAboutSec');
    if (state.resume.data.summary) { if (pvAbout) pvAbout.textContent = state.resume.data.summary; toggle(pvAboutSec, true); }
    else toggle(pvAboutSec, false);

    const edEl = document.getElementById('pvEdu');
    const pvEduSec = document.getElementById('pvEduSec');
    if (state.resume.data.education.length) {
        if (edEl) edEl.innerHTML = state.resume.data.education.map(e =>
            `<div class="a4-edu">
                <div class="a4-edu-deg">${esc(e.degree)}</div>
                <div class="a4-edu-school">${esc(e.institution)}</div>
                <div class="a4-edu-year">${esc(e.startYear)}${e.endYear ? ' – ' + esc(e.endYear) : ''}</div>
            </div>`
        ).join('');
        toggle(pvEduSec, true);
    } else toggle(pvEduSec, false);

    const exEl = document.getElementById('pvExp');
    const pvExpSec = document.getElementById('pvExpSec');
    if (state.resume.data.experience.length) {
        if (exEl) exEl.innerHTML = state.resume.data.experience.map(e => {
            const period = [e.startDate, e.current ? 'тепер' : e.endDate].filter(Boolean).join(' — ');
            const bullets = (e.description || '').split('\n').filter(l => l.trim()).slice(0, 5);
            return `<div class="a4-exp">
                <div class="a4-exp-head">
                    <span class="a4-exp-title">${esc(e.position)}</span>
                    ${period ? `<span class="a4-exp-period">${esc(period)}</span>` : ''}
                </div>
                <div class="a4-exp-company">${esc(e.company)}</div>
                ${bullets.length ? `<ul class="a4-exp-list">${bullets.map(b => `<li>${esc(b.replace(/^[•\-–▸]\s*/, ''))}</li>`).join('')}</ul>` : ''}
            </div>`;
        }).join('');
        toggle(pvExpSec, true);
    } else toggle(pvExpSec, false);

    const prEl = document.getElementById('pvProjects');
    const pvProjSec = document.getElementById('pvProjSec');
    if (state.resume.data.projects.length) {
        if (prEl) prEl.innerHTML = state.resume.data.projects.map(pr =>
            `<div class="a4-proj">
                <div class="a4-proj-head">
                    <span class="a4-proj-name">${esc(pr.name)}</span>
                    ${pr.url ? `<a class="a4-proj-url" href="${esc(pr.url)}" target="_blank">${esc(pr.url)}</a>` : ''}
                </div>
                ${pr.description ? `<div class="a4-proj-desc">${esc(pr.description)}</div>` : ''}
            </div>`
        ).join('');
        toggle(pvProjSec, true);
    } else toggle(pvProjSec, false);

    // Для однотипних шаблонів — навички/мови/посилання в кінці правого блоку
    const pvRightExtra = document.getElementById('pvRightExtra');
    if (pvRightExtra) {
        if (singleCol) {
            let extra = '';
            if (state.resume.data.skills.length)
                extra += `<div class="a4-sec-title">Навички</div><div class="a4-skills-inline">${buildSkillsHTML()}</div>`;
            if (state.resume.data.languages.length)
                extra += `<div class="a4-sec-title">Мови</div>${buildLangsHTML()}`;
            if (Object.values(state.resume.data.links).some(v => v))
                extra += `<div class="a4-sec-title">Посилання</div><div class="pv-links">${buildLinksHTML()}</div>`;
            pvRightExtra.innerHTML = extra;
        } else {
            pvRightExtra.innerHTML = '';
        }
    }
}

// Фото
function togglePhotoField() {
    const photoField = document.getElementById('photoField');
    if (!photoField) return;
    photoField.style.display = '';
    if (state.resume.photo) loadPhoto();
}

function loadPhoto() {
    const photo = document.getElementById('pvPhoto');
    const a4Head = document.getElementById('a4Head');
    const removeBtn = document.getElementById('removePhotoBtn');
    if (photo && state.resume.photo) {
        photo.src = state.resume.photo; photo.style.display = 'block';
        if (a4Head) a4Head.classList.add('has-photo');
        if (removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
        if (photo) photo.style.display = 'none';
        if (a4Head) a4Head.classList.remove('has-photo');
        if (removeBtn) removeBtn.style.display = 'none';
    }
}

function previewPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Фото завелике. Максимум 2MB', 'warn'); event.target.value = ''; return; }
    if (!file.type.startsWith('image/')) { toast('Тільки зображення', 'warn'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        const photo = document.getElementById('pvPhoto'), a4Head = document.getElementById('a4Head'), removeBtn = document.getElementById('removePhotoBtn');
        if (photo) { photo.src = e.target.result; photo.style.display = 'block'; }
        if (a4Head) a4Head.classList.add('has-photo');
        if (removeBtn) removeBtn.style.display = 'inline-flex';
        state.resume.photo = e.target.result;
        scheduleAutosave();
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    const photo = document.getElementById('pvPhoto'), a4Head = document.getElementById('a4Head');
    const fileInput = document.getElementById('f-photo'), removeBtn = document.getElementById('removePhotoBtn');
    if (photo) { photo.src = ''; photo.style.display = 'none'; }
    if (a4Head) a4Head.classList.remove('has-photo');
    if (fileInput) fileInput.value = '';
    if (removeBtn) removeBtn.style.display = 'none';
    state.resume.photo = null;
    scheduleAutosave();
}

// Sidebar Resizer
(function initSidebarResizer() {
    const shell = document.querySelector('.editor-shell');
    const sidebar = document.querySelector('.editor-sidebar');
    if (!shell || !sidebar) return;
    const handle = document.createElement('div');
    handle.className = 'sidebar-resizer';
    sidebar.appendChild(handle);
    const MIN_W = 240, MAX_W = 540;
    let dragging = false, startX = 0, startW = 0;
    handle.addEventListener('mousedown', e => {
        e.preventDefault(); dragging = true; startX = e.clientX; startW = sidebar.getBoundingClientRect().width;
        handle.classList.add('active');
        document.documentElement.style.cursor = 'col-resize';
        document.documentElement.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const w = Math.min(MAX_W, Math.max(MIN_W, startW + (e.clientX - startX)));
        shell.style.gridTemplateColumns = w + 'px 1fr';
    });
    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false; handle.classList.remove('active');
        document.documentElement.style.cursor = '';
        document.documentElement.style.userSelect = '';
    });
})();