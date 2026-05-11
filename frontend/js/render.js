// Генерація HTML

// Дані
const TEMPLATES = [
    { id: 'classic', name: 'Класичний', desc: 'Serif-шрифти, тонкі лінії. Для банків, юристів, держслужбовців.' },
    { id: 'modern', name: 'Сучасний', desc: 'Sans-serif, ліва бічна панель 30%. Для IT-компаній та маркетингу.' },
    { id: 'minimalist', name: 'Мінімалістичний', desc: 'Тільки ч/б, багато повітря. Для UX/UI дизайнерів.' },
    { id: 'creative', name: 'Креативний', desc: 'Шкали навичок, яскравий акцент. Для дизайнерів та SMM.' },
    { id: 'professional', name: 'Професійний', desc: 'Жирні заголовки, горизонтальні лінії. Для керівників.' },
    { id: 'compact', name: 'Компактний', desc: '2 колонки, мінімальні відступи. Для senior-фахівців.' },
    { id: 'elegant', name: 'Елегантний', desc: 'Тонкі шрифти, великі поля. Для HR, PR, консультантів.' },
    { id: 'it-special', name: 'IT-Спеціаліст', desc: 'Моноширинний шрифт, теги технологій. Для розробників та DevOps.' }
];

const SECTIONS = [
    { id: 'personal', icon: '👤', label: 'Дані' },
    { id: 'summary', icon: '💬', label: 'Про себе' },
    { id: 'experience', icon: '💼', label: 'Досвід' },
    { id: 'education', icon: '🎓', label: 'Освіта' },
    { id: 'skills', icon: '⚡', label: 'Навички' },
    { id: 'languages', icon: '🌍', label: 'Мови' },
    { id: 'projects', icon: '🚀', label: 'Проєкти' },
    { id: 'links', icon: '🔗', label: 'Посилання' }
];

const FEATURES = [
    { icon: '📄', color: 'c', title: '8 шаблонів', desc: 'Обери шаблон, що пасує твоїй професії.' },
    { icon: '🎯', color: 't', title: 'Аналіз вакансії', desc: 'Порівняй резюме з вимогами - дізнайся відсоток збігів і що додати.' },
    { icon: '⚡', color: 'i', title: 'Живий перегляд', desc: 'Заповнюй - і одразу бач фінальний вигляд. Без збережень і перезавантажень.' },
    { icon: '🖨', color: 'c', title: 'Експорт у PDF', desc: 'Якісний PDF-файл, готовий до друку або відправки рекрутеру.' },
    { icon: '🤖', color: 't', title: 'AI-поради', desc: 'Штучний інтелект проаналізує вакансію та підкаже, що треба додати.' },
    { icon: '📱', color: 'i', title: 'Адаптивний дизайн', desc: 'Працює на телефоні, планшеті та десктопі. Редагуй де зручно.' }
];

// Картки шаблонів
function getThumbHTML(type) {
    return `<div class="tmpl-mini tmpl-mini-${type}">
        <div class="t-line t-line-1"></div>
        <div class="t-line t-line-2"></div>
        <div class="t-line t-line-3"></div>
        <div class="t-line t-line-4"></div>
        <div class="t-line t-line-5"></div>
    </div>`;
}

function renderTemplateCards() {
    const grid = document.querySelector('.tmpl-grid');
    if (!grid) return;
    const current = (typeof state !== 'undefined' && state.resume) ? (state.resume.template || 'classic') : 'classic';

    grid.innerHTML = TEMPLATES.map(t => `
        <div class="tmpl-card ${t.id === current ? 'selected' : ''}" onclick="selectTemplate(this,'${t.id}')" tabindex="0" role="button" aria-pressed="${t.id === current}">
            <div class="tmpl-thumb ct-${t.id}">
                <div class="tmpl-badge">✓</div>
                ${getThumbHTML(t.id)}
            </div>
            <div class="tmpl-info">
                <div class="tmpl-name">${t.name}</div>
                <div class="tmpl-desc">${t.desc}</div>
            </div>
        </div>
    `).join('');
}

// Секції редактора
function renderSectionNav() {
    const nav = document.querySelector('.sec-nav');
    if (!nav) return;

    nav.innerHTML = SECTIONS.map((s, i) => `
        <div class="sec-item ${i === 0 ? 'active' : ''}" onclick="switchSec(this,'${s.id}')" tabindex="0" role="button">
            <span class="sec-icon">${s.icon}</span>
            <span class="sec-label">${s.label}</span>
            <span id="chk-${s.id}" class="sec-check"></span>
        </div>
    `).join('');
}

// Features
function renderFeatures() {
    const grid = document.querySelector('.features-grid');
    if (!grid) return;

    grid.innerHTML = FEATURES.map(f => `
        <div class="feature-cell">
            <div class="fi fi-${f.color}">${f.icon}</div>
            <div class="feature-title">${f.title}</div>
            <div class="feature-desc">${f.desc}</div>
        </div>
    `).join('');
}

// Дашборд
function renderDashboardCards(list) {
    const THUMB_CLASSES = ['ct-classic', 'ct-modern', 'ct-minimalist', 'ct-creative', 'ct-professional', 'ct-compact', 'ct-elegant', 'ct-it-special'];

    return list.map((r, i) => {
        const tc = THUMB_CLASSES[i % THUMB_CLASSES.length];
        const dt = new Date(r.updated_at).toLocaleDateString('uk-UA', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });
        const tmplName = {
            classic: 'Класичний', modern: 'Сучасний', minimalist: 'Мінімалістичний',
            creative: 'Креативний', professional: 'Професійний', compact: 'Компактний',
            elegant: 'Елегантний', 'it-special': 'IT'
        }[r.template] || r.template || 'classic';

        return `
        <div class="resume-card" onclick="openResume(${r.id})">
            <div class="card-thumb ${tc}">
                <div class="card-thumb-pattern"></div>
                <div class="card-thumb-doc">
                    <div class="doc-bar"></div><div class="doc-bar sm"></div>
                    <div class="doc-sep"></div>
                    <div class="doc-line"></div><div class="doc-line sm"></div><div class="doc-line"></div>
                </div>
            </div>
            <div class="card-body">
                <div class="card-name">${esc(r.title)}</div>
                <div class="card-meta">${esc(tmplName)} · ${dt}</div>
            </div>
            <div class="card-actions">
                <button class="btn btn-ghost btn-sm" style="flex:1" onclick="event.stopPropagation();openResume(${r.id})">Редагувати</button>
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();generatePDF(${r.id})">PDF</button>
                <button class="btn btn-danger btn-sm btn-icon" onclick="event.stopPropagation();deleteResume(${r.id})" title="Видалити">✕</button>
            </div>
        </div>`;
    }).join('');
}

function renderEmptyDashboard() {
    return `
    <div class="empty-state">
        <div class="empty-state-icon">📄</div>
        <h3>Ще немає резюме</h3>
        <p>Створіть перше резюме, щоб почати</p>
        <button class="btn btn-copper" onclick="navigate('templates')">Створити резюме</button>
    </div>`;
}

// Аналіз
function renderAnalysisLoading() {
    return `
        <div class="analysis-loading">
            <div class="spinner-large"></div>
            <p>🔄 Аналізуємо резюме...</p>
            <small>Перший запуск може зайняти до 2 хвилин</small>
        </div>`;
}

function renderAnalysisError(msg) {
    return `
        <div class="analysis-error">
            <span class="err-icon">⚠️</span>
            <p>${esc(msg)}</p>
            <button onclick="runAnalysis()" class="btn btn-sm">🔄 Спробувати ще</button>
        </div>`;
}

function renderAnalysisResults(r) {
    const score = r.score || 0;
    const level = score >= 65 ? 'good' : score >= 40 ? 'mid' : 'bad';
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const gradientColors = {
        'good': ['#2A7A5E', '#1D6B68'],
        'mid': ['#C47B3A', '#D97706'],
        'bad': ['#C94040', '#A32828']
    };
    const colors = gradientColors[level] || gradientColors.mid;

    const modelWarning = r.modelStatus?.warning ? `
        <div class="model-loading-notice">
            <span class="model-loading-notice-icon">⏳</span>
            <div class="model-loading-notice-text">
                <strong>Перший запуск</strong>
                <span>${esc(r.modelStatus.warning)}</span>
            </div>
        </div>` : '';

    const foundHTML = (r.found || []).length
        ? (r.found || []).map(k => `<span class="skill-tag skill-found">${esc(k.word)}</span>`).join('')
        : '<span class="empty-hint">Немає співпадінь</span>';

    const missingHTML = (r.missing || []).length
        ? (r.missing || []).map(k => `<span class="skill-tag skill-missing">${esc(k.word)}</span>`).join('')
        : '<span class="empty-hint">Всі навички знайдено!</span>';

    const recsHTML = (r.recommendations || []).map(rec => `
        <div class="advice-card advice-${rec.level}">
            <div class="advice-icon">${rec.level === 'red' ? '🔴' : rec.level === 'yellow' ? '🟡' : '🟢'}</div>
            <div class="advice-body">
                ${rec.word ? `<code class="advice-keyword">${esc(rec.word)}</code>` : ''}
                <p>${esc(rec.text)}</p>
            </div>
        </div>`).join('');

    const totalFound = (r.found || []).length;
    const totalMissing = (r.missing || []).length;
    const techFound = (r.found_tech || []).length;
    const softFound = (r.found_soft || []).length;
    const businessFound = (r.found_business || []).length;

    return `
        <div class="analysis-dashboard">
            ${modelWarning}
            
            <div class="score-hero">
                <div class="score-visual">
                    <svg width="150" height="150" viewBox="0 0 150 150">
                        <defs>
                            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
                                <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        <circle cx="75" cy="75" r="${radius}" fill="none" stroke="#F0F0EC" stroke-width="10"/>
                        <circle cx="75" cy="75" r="${radius}" fill="none" stroke="url(#scoreGrad)" stroke-width="10"
                                stroke-linecap="round" stroke-dasharray="${circumference}"
                                stroke-dashoffset="${offset}" transform="rotate(-90 75 75)"/>
                        <text x="75" y="72" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-weight="bold" fill="#0D0D0F">${score}</text>
                        <text x="75" y="95" text-anchor="middle" font-size="14" fill="#72727A">відсотків</text>
                    </svg>
                </div>
                <div class="score-info">
                    <div class="score-verdict">${esc(r.verdict || 'Аналіз завершено')}</div>
                    <div class="score-meta">
                        <span class="meta-badge">${r.method === 'semantic' ? '🧠 Семантична модель' : r.method?.startsWith('gemini') ? '🤖 Gemini' : '📊 Статистичний'}</span>
                    </div>
                </div>
            </div>
            
            <div class="stats-mini-grid">
                <div class="mini-stat mini-found">
                    <span class="mini-stat-num">${totalFound}</span>
                    <span class="mini-stat-lbl">знайдено</span>
                </div>
                <div class="mini-stat mini-tech">
                    <span class="mini-stat-num">${techFound}</span>
                    <span class="mini-stat-lbl">технічні</span>
                </div>
                <div class="mini-stat mini-soft">
                    <span class="mini-stat-num">${softFound + businessFound}</span>
                    <span class="mini-stat-lbl">soft + бізнес</span>
                </div>
                <div class="mini-stat mini-miss">
                    <span class="mini-stat-num">${totalMissing}</span>
                    <span class="mini-stat-lbl">відсутні</span>
                </div>
            </div>
            
            <div class="skills-analysis">
                <div class="skills-col">
                    <h3>✅ У резюме</h3>
                    <div class="skills-cloud">${foundHTML}</div>
                </div>
                <div class="skills-col">
                    <h3>❌ Відсутні</h3>
                    <div class="skills-cloud">${missingHTML}</div>
                </div>
            </div>
            
            <div class="advice-section">
                <h3>💡 Як покращити резюме</h3>
                <div class="advice-list">${recsHTML}</div>
            </div>
        </div>`;
}

// Досвід
function renderExpList() {
    const el = document.getElementById('expList');
    if (!el) return;
    el.innerHTML = state.resume.data.experience.map((e, i) => `
    <div class="entry-card">
      <div class="entry-card-head">
        <div class="entry-card-label">Місце роботи ${i + 1}</div>
        <button class="btn btn-danger btn-sm btn-icon" onclick="removeExp(${i})">✕</button>
      </div>
      <div class="form-row">
        <div class="fg"><label>Посада</label><input value="${esc(e.position || '')}" oninput="updateExp(${i},'position',this.value)"></div>
        <div class="fg"><label>Компанія</label><input value="${esc(e.company || '')}" oninput="updateExp(${i},'company',this.value)"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Початок</label><input value="${esc(e.startDate || '')}" placeholder="09/2022" oninput="updateExp(${i},'startDate',this.value)"></div>
        <div class="fg"><label>Кінець</label><input value="${esc(e.endDate || '')}" placeholder="або залиште порожнім" oninput="updateExp(${i},'endDate',this.value)" ${e.current ? 'disabled' : ''}></div>
      </div>
      <div class="fg">
        <label style="display:flex;align-items:center;gap:7px;text-transform:none;font-size:13px;">
          <input type="checkbox" ${e.current ? 'checked' : ''} onchange="updateExp(${i},'current',this.checked)" style="width:auto">
          Теперішнє місце роботи
        </label>
      </div>
      <div class="fg"><label>Опис обов'язків</label>
        <textarea rows="3" oninput="updateExp(${i},'description',this.value)">${esc(e.description || '')}</textarea>
      </div>
    </div>`).join('');
}

function renderEduList() {
    const el = document.getElementById('eduList');
    if (!el) return;
    el.innerHTML = state.resume.data.education.map((e, i) => `
    <div class="entry-card">
      <div class="entry-card-head">
        <div class="entry-card-label">Освіта ${i + 1}</div>
        <button class="btn btn-danger btn-sm btn-icon" onclick="removeEdu(${i})">✕</button>
      </div>
      <div class="fg"><label>Заклад освіти</label><input value="${esc(e.institution || '')}" oninput="updateEdu(${i},'institution',this.value)"></div>
      <div class="fg"><label>Ступінь / Спеціальність</label><input value="${esc(e.degree || '')}" oninput="updateEdu(${i},'degree',this.value)"></div>
      <div class="fg"><label>Галузь знань</label><input value="${esc(e.field || '')}" oninput="updateEdu(${i},'field',this.value)"></div>
      <div class="form-row">
        <div class="fg"><label>Рік початку</label><input value="${esc(e.startYear || '')}" placeholder="2020" oninput="updateEdu(${i},'startYear',this.value)"></div>
        <div class="fg"><label>Рік закінчення</label><input value="${esc(e.endYear || '')}" placeholder="2024" oninput="updateEdu(${i},'endYear',this.value)"></div>
      </div>
    </div>`).join('');
}

function renderSkillTags() {
    const wrap = document.getElementById('skillTags');
    if (!wrap) return;
    wrap.innerHTML = state.resume.data.skills.map((sk, i) => {
        const name = typeof sk === 'string' ? sk : sk.name;
        return `<span class="tag">${esc(name)} <span class="tag-remove" onclick="removeSkill(${i})">×</span></span>`;
    }).join('');
}

function renderLangList() {
    const el = document.getElementById('langList');
    if (!el) return;
    el.innerHTML = state.resume.data.languages.map((l, i) => `
    <div class="entry-card">
      <div class="entry-card-head">
        <div class="entry-card-label">Мова ${i + 1}</div>
        <button class="btn btn-danger btn-sm btn-icon" onclick="removeLang(${i})">✕</button>
      </div>
      <div class="form-row">
        <div class="fg"><label>Мова</label><input value="${esc(l.language || '')}" oninput="updateLang(${i},'language',this.value)"></div>
        <div class="fg"><label>Рівень</label>
          <select onchange="updateLang(${i},'level',this.value)">
            ${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lv => `<option ${lv === l.level ? 'selected' : ''}>${lv}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>`).join('');
}

function renderProjList() {
    const el = document.getElementById('projList');
    if (!el) return;
    el.innerHTML = state.resume.data.projects.map((p, i) => `
    <div class="entry-card">
      <div class="entry-card-head">
        <div class="entry-card-label">Проєкт ${i + 1}</div>
        <button class="btn btn-danger btn-sm btn-icon" onclick="removeProj(${i})">✕</button>
      </div>
      <div class="fg"><label>Назва</label><input value="${esc(p.name || '')}" oninput="updateProj(${i},'name',this.value)"></div>
      <div class="fg"><label>Посилання (GitHub / URL)</label><input value="${esc(p.url || '')}" oninput="updateProj(${i},'url',this.value)"></div>
      <div class="fg"><label>Опис</label><textarea rows="2" oninput="updateProj(${i},'description',this.value)">${esc(p.description || '')}</textarea></div>
    </div>`).join('');
}

// Ініціалізація
(function initRender() {
    document.addEventListener('DOMContentLoaded', () => {
        renderTemplateCards();
        renderSectionNav();
        renderFeatures();
    });
})();