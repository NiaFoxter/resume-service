// Дашборд, шаблони, PDF, аналіз

// Дашборд
async function loadDashboard() {
    if (!state.auth.token) return;
    try {
        const list = await api('GET', '/resumes');
        const grid = document.getElementById('resumeGrid');
        if (!grid) return;
        if (!list.length) { grid.innerHTML = renderEmptyDashboard(); return; }
        grid.innerHTML = renderDashboardCards(list) + `
        <div class="new-card" onclick="navigate('templates')">
            <div class="new-card-icon">＋</div>
            <div class="new-card-label">Нове резюме</div>
        </div>`;
    } catch (e) { toast(e.message, 'bad'); }
}

// CRUD
async function createNewResume() {
    if (!requireAuth()) return;
    try {
        const r = await api('POST', '/resumes', { title: 'Нове резюме', template: state.resume.template || 'classic', data: {} });
        state.resume.currentId = r.id;
        state.resume.template = r.template || 'classic';
        resetResumeData();
        const titleEl = document.getElementById('resumeTitle');
        if (titleEl) titleEl.value = 'Нове резюме';
        applyTemplateClass(state.resume.template);
        togglePhotoField(); fillForms(); navigate('editor');
    } catch (e) { toast(e.message, 'bad'); }
}

function resetResumeData() {
    state.resume.data = {
        personal: { firstName: '', lastName: '', jobTitle: '', email: '', phone: '', city: '', linkedin: '' },
        summary: '', experience: [], education: [], skills: [], languages: [], projects: [],
        links: { github: '', website: '', telegram: '' }
    };
    state.resume.photo = null;
    const photo = document.getElementById('pvPhoto'), a4Head = document.getElementById('a4Head');
    const fileInput = document.getElementById('f-photo'), removeBtn = document.getElementById('removePhotoBtn');
    if (photo) { photo.src = ''; photo.style.display = 'none'; }
    if (a4Head) a4Head.classList.remove('has-photo');
    if (fileInput) fileInput.value = '';
    if (removeBtn) removeBtn.style.display = 'none';
}

async function openResume(id) {
    try {
        const r = await api('GET', '/resumes/' + id);
        state.resume.currentId = r.id;
        state.resume.template = r.template || 'classic';
        const d = r.data || {};
        state.resume.photo = d.photo || r.photo || null;
        state.resume.data.personal = { firstName: '', lastName: '', jobTitle: '', email: '', phone: '', city: '', linkedin: '', ...(d.personal || {}) };
        state.resume.data.summary = d.summary || '';
        state.resume.data.experience = d.experience || [];
        state.resume.data.education = d.education || [];
        state.resume.data.skills = d.skills || [];
        state.resume.data.languages = d.languages || [];
        state.resume.data.projects = d.projects || [];
        state.resume.data.links = { github: '', website: '', telegram: '', ...(d.links || {}) };
        const titleEl = document.getElementById('resumeTitle');
        if (titleEl) titleEl.value = r.title || '';
        applyTemplateClass(state.resume.template);
        togglePhotoField(); fillForms(); loadPhoto(); navigate('editor');
    } catch (e) { toast(e.message, 'bad'); }
}

async function deleteResume(id) {
    showConfirm(
        'Видалити резюме?',
        'Цю дію неможливо буде скасувати. Резюме буде видалено назавжди.',
        async () => {
            try {
                await api('DELETE', '/resumes/' + id);
                toast('Резюме видалено 🗑️', 'ok');
                loadDashboard();
            } catch (e) {
                toast(e.message, 'bad');
            }
        }
    );
}

// PDF
async function downloadPDF() {
    if (!state.resume.currentId) { toast('Спочатку збережіть резюме', 'warn'); return; }

    const btn = document.getElementById('pdfBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    try {
        readForms();
        await autosave();
        updatePreview();

        await new Promise(r => setTimeout(r, 120));

        const source = document.getElementById('a4Preview');
        if (!source) throw new Error('Немає прев\'ю');

        const titleEl = document.getElementById('resumeTitle');
        const fname = (titleEl?.value.trim() || 'resume')
            .replace(/[^\w\sа-яА-ЯіїєґІЇЄҐ\-]/g, '').trim() || 'resume';

        const allCSS = [...document.styleSheets].map(sheet => {
            try {
                return [...sheet.cssRules].map(r => r.cssText).join('\n');
            } catch { return ''; }
        }).join('\n');

        const pdfOverride = `
            * { transition: none !important; animation: none !important; }
            .a4 { box-shadow: none !important; border-radius: 0 !important; width: 794px !important; }
            .a4-left { min-height: 100vh; }
            .empty-section { display: none !important; }
        `;

        const cloneHTML = source.outerHTML;

        const opt = {
            margin: 0,
            filename: fname + '.pdf',
            image: { type: 'jpeg', quality: 0.97 },
            html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-1;';
        wrap.innerHTML = `<style>${allCSS}\n${pdfOverride}</style>${cloneHTML}`;
        document.body.appendChild(wrap);

        const clone = wrap.querySelector('.a4');
        if (clone) {
const sectionsToCheck = [
                { id: 'pvAboutSec', selector: '.a4-about' },
                { id: 'pvExpSec', selector: '.a4-exp' },
                { id: 'pvEduSec', selector: '.a4-edu' },
                { id: 'pvProjSec', selector: '.a4-proj' },
                { id: 'pvSkillsSec', selector: '.a4-skill, .a4-skill-pill' },
                { id: 'pvLangsSec', selector: '.a4-lang' },
                { id: 'pvLinksSec', selector: '.a4-link-item' }
            ];
            
            sectionsToCheck.forEach(({ selector }) => {
                const section = clone.querySelector(selector)?.closest('[id$="Sec"]');
                if (section) {
                    const content = section.querySelector(selector);
                    if (!content || !content.textContent.trim()) {
                        section.classList.add('empty-section');
                    }
                }
            });
        }


        const pdfEl = wrap.querySelector('.a4');
        await html2pdf().set(opt).from(pdfEl).save();

        document.body.removeChild(wrap);
        toast('PDF завантажено ✓', 'ok');

    } catch (e) {
        toast('Помилка PDF: ' + e.message, 'bad');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '↓ PDF';
    }
}

async function generatePDF(id) {
    try {
        await openResume(id);
        await new Promise(r => setTimeout(r, 500));
        await downloadPDF();
    } catch (e) { toast(e.message, 'bad'); }
}

// Шаблони
const TEMPLATE_NAMES = {
    'classic': 'Класичний', 'modern': 'Сучасний', 'minimalist': 'Мінімалістичний',
    'creative': 'Креативний', 'professional': 'Професійний', 'compact': 'Компактний',
    'elegant': 'Елегантний', 'it-special': 'IT-Спеціаліст'
};

let _selectedTemplate = 'classic';

function selectTemplate(card, name) {
    document.querySelectorAll('.tmpl-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    _selectedTemplate = name;
    card.classList.add('tmpl-card-pulse');
    setTimeout(() => card.classList.remove('tmpl-card-pulse'), 400);

    const a4 = document.getElementById('a4Preview');
    if (a4) {
        a4.classList.add('tmpl-switching');
        setTimeout(() => {
            state.resume.template = name;
            applyTemplateClass(name);
            if (typeof togglePhotoField === 'function') togglePhotoField();
            if (typeof updatePreview === 'function') updatePreview();
            if (typeof updateEditorTemplateLbl === 'function') updateEditorTemplateLbl();
            a4.classList.remove('tmpl-switching');
        }, 180);
    }
}

function applyTemplateClass(name) {
    const a4 = document.getElementById('a4Preview');
    if (!a4) return;
    [...a4.classList].filter(c => c.startsWith('tmpl-') && c !== 'tmpl-switching').forEach(c => a4.classList.remove(c));
    a4.classList.add('tmpl-' + (name || 'classic'));
}

async function applyTemplate() {
    if (!requireAuth()) return;
    if (state.resume.currentId) {
        state.resume.template = _selectedTemplate;
        applyTemplateClass(_selectedTemplate);
        if (typeof togglePhotoField === 'function') togglePhotoField();
        if (typeof updatePreview === 'function') updatePreview();
        scheduleAutosave();
        toast(`Шаблон «${TEMPLATE_NAMES[_selectedTemplate] || _selectedTemplate}» застосовано`, 'ok');
        navigate('editor'); return;
    }
    try {
        const r = await api('POST', '/resumes', { title: 'Нове резюме', template: _selectedTemplate, data: {} });
        state.resume.currentId = r.id;
        state.resume.template = _selectedTemplate;
        resetResumeData();
        const titleEl = document.getElementById('resumeTitle');
        if (titleEl) titleEl.value = 'Нове резюме';
        applyTemplateClass(_selectedTemplate);
        if (typeof togglePhotoField === 'function') togglePhotoField();
        fillForms(); navigate('editor');
        toast(`Шаблон «${TEMPLATE_NAMES[_selectedTemplate] || _selectedTemplate}» застосовано!`, 'ok');
    } catch (e) { toast(e.message, 'bad'); }
}

function syncTemplateSelection() {
    const current = state.resume.template || 'classic';
    _selectedTemplate = current;
    document.querySelectorAll('.tmpl-card').forEach(card => {
        const m = (card.getAttribute('onclick') || '').match(/selectTemplate\(this,'([^']+)'\)/);
        card.classList.toggle('selected', m ? m[1] === current : false);
    });
}

function updateEditorTemplateLbl() {
    const lbl = document.getElementById('currentTmplLabel');
    if (!lbl) return;
    lbl.textContent = (TEMPLATE_NAMES[state.resume.template] || state.resume.template || 'Класичний') + ' ▾';
}

// Аналіз
let _fallbackRid = null;
let _fallbackJobText = null;

async function loadAnalysisResumes() {
    if (!state.auth.token) return;
    try {
        const list = await api('GET', '/resumes');
        const sel = document.getElementById('analyzeResumeSelect');
        if (!sel) return;
        sel.innerHTML = '<option value="">— оберіть резюме —</option>' +
            list.map(r => `<option value="${r.id}">${esc(r.title)}</option>`).join('');
        if (state.resume.currentId) sel.value = state.resume.currentId;
    } catch { }
}

async function runAnalysis() {
    const jobText = document.getElementById('jobText')?.value.trim();
    const rid = document.getElementById('analyzeResumeSelect')?.value;
    const btn = document.getElementById('analyzeBtn');
    const resEl = document.getElementById('analysisResults');

    if (!rid) { toast('Оберіть резюме', 'warn'); return; }
    if (!jobText || jobText.length < 20) { toast('Текст вакансії занадто короткий', 'warn'); return; }

    _fallbackRid = rid;
    _fallbackJobText = jobText;

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div><span>Аналіз ШІ...</span>';
    resEl.innerHTML = renderAnalysisLoading();

    try {
        const result = await api('POST', `/resumes/${rid}/analyze/gemini`, { jobText });
        resEl.innerHTML = renderAnalysisResults(result);
        toast(`Аналіз завершено (${result.score}%)`, 'ok');
    } catch (geminiError) {
        console.warn('Gemini failed:', geminiError.message);
        toast('Gemini недоступний — використовуємо локальний аналіз', 'warn');

        try {
            const localResult = await api('POST', `/resumes/${rid}/analyze`, { jobText });
            resEl.innerHTML = renderAnalysisResults(localResult);
            toast('Локальний аналіз завершено', 'ok');
        } catch (localError) {
            console.error('Local analysis failed:', localError);
            toast(localError.message, 'bad');
            resEl.innerHTML = renderAnalysisError(localError.message);
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🔍 Проаналізувати</span>';
    }
}

// function buildResumeText(d) {
//     const parts = [];
//     const p = d.personal || {};

//     if (p.jobTitle) parts.push(`Посада: ${p.jobTitle}`);
//     if (p.firstName || p.lastName) parts.push(`Ім'я: ${p.firstName || ''} ${p.lastName || ''}`.trim());
//     if (d.summary) parts.push(`Про себе: ${d.summary}`);

//     (d.skills || []).forEach(s => parts.push(`Навичка: ${s}`));

//     (d.experience || []).forEach(e => {
//         const line = [`Досвід: ${e.position || ''}`];
//         if (e.company) line.push(`в ${e.company}`);
//         parts.push(line.join(' '));
//         if (e.description) parts.push(e.description);
//     });

//     (d.education || []).forEach(e => {
//         const line = [];
//         if (e.degree) line.push(e.degree);
//         if (e.institution) line.push(e.institution);
//         if (e.field) line.push(`(${e.field})`);
//         if (line.length) parts.push(`Освіта: ${line.join(' — ')}`);
//     });

//     (d.languages || []).forEach(l => {
//         if (l.language) parts.push(`Мова: ${l.language}${l.level ? ' (' + l.level + ')' : ''}`);
//     });

//     (d.projects || []).forEach(pr => {
//         if (pr.name) parts.push(`Проєкт: ${pr.name}`);
//         if (pr.description) parts.push(pr.description);
//     });

//     const lks = Object.entries(d.links || {}).filter(([, v]) => v);
//     lks.forEach(([k, v]) => parts.push(`${k}: ${v}`));

//     return parts.join('\n');
// }

// async function callGeminiAnalysis(resumeText, jobText) {
//     const prompt = `Ти - експерт з HR та ATS-систем. Проаналізуй відповідність резюме до вакансії.
//         РЕЗЮМЕ:
//         ${resumeText}
        
//         ВАКАНСІЯ:
//         ${jobText}
        
//         Дай відповідь ТІЛЬКИ у форматі JSON (без markdown, без пояснень поза JSON):
//         {
//         "score": число від 0 до 100 (відсоток відповідності),
//         "verdict": "коротка оцінка 3-5 слів",
//         "found": [{"word": "ключове слово з вакансії що є в резюме"}],
//         "missing": [{"word": "важливе ключове слово з вакансії якого немає в резюме"}],
//         "recommendations": [
//             {"level": "red|yellow|green", "word": "слово або ''", "text": "конкретна порада українською"}
//         ]
//         }
        
//         Правила:
//         - score: враховуй технічні навички (50%), досвід (30%), освіту (10%), м'які навички (10%)
//         - found: до 10 найважливіших слів/навичок, що РЕАЛЬНО є в резюме
//         - missing: до 8 важливих вимог вакансії, яких НЕМАЄ в резюме
//         - recommendations: 3-6 конкретних порад (red=критично, yellow=бажано, green=добре)
//         - НЕ вигадуй навички, яких немає в резюме
//         - відповідай ТІЛЬКИ валідним JSON, без коментарів`;

//     const response = await fetch(GEMINI_URL, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//             contents: [{ parts: [{ text: prompt }] }],
//             generationConfig: {
//                 temperature: 0.2,
//                 maxOutputTokens: 4096,
//                 topP: 0.95
//             }
//         })
//     });

//     if (!response.ok) {
//         const errData = await response.json().catch(() => ({}));
//         const msg = errData?.error?.message || `HTTP ${response.status}`;
//         throw new Error(`Gemini API: ${msg}`);
//     }

//     const data = await response.json();
//     const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

//     let jsonStr = text;

//     const mdMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
//     if (mdMatch) jsonStr = mdMatch[1];

//     const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
//     if (!jsonMatch) throw new Error('Gemini повернув некоректну відповідь');

//     const result = JSON.parse(jsonMatch[0]);

//     result.score = Math.max(0, Math.min(100, Math.round(result.score || 0)));
//     result.verdict = result.verdict || 'OK';
//     result.found = (result.found || []).slice(0, 10);
//     result.missing = (result.missing || []).slice(0, 8);
//     result.total = result.found.length + result.missing.length;
//     result.recommendations = result.recommendations || [];

//     return result;
// }