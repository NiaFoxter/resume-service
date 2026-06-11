import json, os, re, sqlite3
from datetime import datetime, timedelta, timezone
from functools import wraps
from collections import Counter
from typing import NamedTuple

from dotenv import load_dotenv
load_dotenv()

import jwt
import numpy as np
from flask import Flask, request, jsonify, g, send_from_directory
from flask.wrappers import Response
from werkzeug.security import generate_password_hash, check_password_hash

from nlp_data import (
    SYNONYMS,
    TECH_SKILLS,
    SOFT_SKILLS,
    BUSINESS_SKILLS,
    JOB_NOISE,
    extract_keywords,
    normalize_keyword,
    tokenize,
)


# App config
app = Flask(__name__, static_folder=None)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-in-prod')
app.config['JWT_EXPIRE_HOURS'] = int(os.environ.get('JWT_EXPIRE_HOURS', '24'))

DB_PATH = os.path.join(os.path.dirname(__file__), 'resume.db')
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'dist')
GEMINI_KEY = os.environ.get('GEMINI_KEY', '')
GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-3.1-flash-lite',
]

GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

# Semantic model (lazy)
_model = None
_model_loading = False
_model_loaded = False
_MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'


def get_semantic_model():
    global _model, _model_loading, _model_loaded
    if _model is not None or _model_loading:
        return _model
    try:
        from sentence_transformers import SentenceTransformer
        _model_loading = True
        print(f'[AI] Завантаження моделі {_MODEL_NAME}...')
        _model = SentenceTransformer(_MODEL_NAME)
        _model_loaded = True
        print('[AI] Модель готова')
    except ImportError:
        print('[AI] sentence-transformers не встановлено — використовується TF-IDF.')
    except Exception as exc:
        print(f'[AI] Не вдалося завантажити модель: {exc} — використовується TF-IDF.')
    finally:
        _model_loading = False
    return _model


# Frontend serving
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/') or path.startswith('auth/') or path.startswith('resumes/'):
        return err('Not found', 404)
    full = os.path.join(FRONTEND_DIR, path)
    if path and os.path.isfile(full):
        return send_from_directory(FRONTEND_DIR, path)
    index = os.path.join(FRONTEND_DIR, 'index.html')
    if os.path.isfile(index):
        return send_from_directory(FRONTEND_DIR, 'index.html')
    return err('Збірку фронтенду не знайдено. Виконайте npm run build.', 404)


# CORS & MIME
@app.after_request
def add_cors_and_mime(resp: Response):
    resp.headers['Access-Control-Allow-Origin']  = '*'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    resp.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    ext_mime = {
        '.js': 'application/javascript', '.mjs': 'application/javascript',
        '.css': 'text/css', '.wasm': 'application/wasm',
        '.json': 'application/json', '.html': 'text/html',
    }
    for ext, mime in ext_mime.items():
        if request.path.endswith(ext):
            resp.headers['Content-Type'] = mime
            break
    return resp


@app.route('/api', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/api/<path:path>', methods=['OPTIONS'])
def options_h(path=''):
    return jsonify({}), 200


# Database
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA journal_mode=WAL')
        g.db.execute('PRAGMA foreign_keys=ON')
    return g.db


@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db:
        db.close()


def init_db():
    with sqlite3.connect(DB_PATH) as db:
        db.executescript("""
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            first_name TEXT NOT NULL DEFAULT '',
            last_name TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL DEFAULT 'Нове резюме',
            template TEXT NOT NULL DEFAULT 'classic',
            data TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
        """)
    print(f'[DB] {DB_PATH}')


init_db()


# Auth helpers
def make_token(uid, email):
    return jwt.encode(
        {
            'sub': str(uid),
            'email': email,
            'exp': datetime.now(timezone.utc) + timedelta(hours=app.config['JWT_EXPIRE_HOURS']),
        },
        app.config['SECRET_KEY'],
        algorithm='HS256',
    )


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return err('Токен відсутній', 401)
        try:
            payload = jwt.decode(auth[7:], app.config['SECRET_KEY'], algorithms=['HS256'])
            g.user_id = int(payload['sub'])
            g.email = payload['email']
        except jwt.ExpiredSignatureError:
            return err('Токен прострочено', 401)
        except jwt.InvalidTokenError:
            return err('Недійсний токен', 401)
        return f(*args, **kwargs)
    return wrapper


# Response helpers
def ok(data=None, **kw):
    body = {'ok': True}
    if data is not None:
        body['data'] = data
    body.update(kw)
    return jsonify(body)


def err(msg, code=400):
    return jsonify({'ok': False, 'error': msg}), code


def parse_resume_row(row):
    if not row:
        return None
    r = dict(row)
    try:
        r['data'] = json.loads(r['data'])
    except Exception:
        r['data'] = {}
    return r


# Health
@app.route('/api/health')
def health():
    return ok({
        'status': 'ok',
        'gemini': bool(GEMINI_KEY),
        'model_ready': _model_loaded,
        'model_loading': _model_loading,
    })


# Auth routes
_EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


@app.route('/auth/register', methods=['POST'])
def register():
    b = request.get_json(silent=True) or {}
    email = (b.get('email') or '').strip().lower()
    password = (b.get('password') or '').strip()
    first_name = (b.get('firstName') or '').strip()
    last_name = (b.get('lastName') or '').strip()

    if not email or not _EMAIL_RE.match(email):
        return err('Некоректна електронна пошта')
    if len(password) < 8:
        return err('Пароль: мінімум 8 символів')
    if not first_name:
        return err("Вкажіть ім'я")

    db = get_db()
    if db.execute('SELECT 1 FROM users WHERE email=?', (email,)).fetchone():
        return err('Користувач із такою поштою вже існує', 409)

    cur = db.execute(
        'INSERT INTO users (email, password, first_name, last_name) VALUES (?, ?, ?, ?)',
        (email, generate_password_hash(password), first_name, last_name),
    )
    db.commit()
    uid = cur.lastrowid
    return ok({
        'token': make_token(uid, email),
        'userId': uid,
        'firstName': first_name,
        'lastName': last_name,
    }), 201


@app.route('/auth/login', methods=['POST'])
def login():
    b = request.get_json(silent=True) or {}
    email = (b.get('email') or '').strip().lower()
    password = (b.get('password') or '').strip()

    if not email or not password:
        return err('Вкажіть пошту та пароль')

    db   = get_db()
    user = db.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
    if not user or not check_password_hash(user['password'], password):
        return err('Невірна пошта або пароль', 401)

    return ok({
        'token': make_token(user['id'], email),
        'userId': user['id'],
        'firstName': user['first_name'],
        'lastName': user['last_name'],
    })


@app.route('/auth/me', methods=['GET'])
@require_auth
def me():
    db = get_db()
    user = db.execute(
        'SELECT id, email, first_name, last_name, created_at FROM users WHERE id=?',
        (g.user_id,),
    ).fetchone()
    if not user:
        return err('Не знайдено', 404)
    return ok(dict(user))


# Resume CRUD
@app.route('/resumes', methods=['GET'])
@require_auth
def list_resumes():
    db = get_db()
    rows = db.execute(
        'SELECT id, title, template, updated_at, created_at FROM resumes'
        ' WHERE user_id=? ORDER BY updated_at DESC',
        (g.user_id,),
    ).fetchall()
    return ok([dict(r) for r in rows])


@app.route('/resumes', methods=['POST'])
@require_auth
def create_resume():
    b = request.get_json(silent=True) or {}
    title = (b.get('title') or 'Нове резюме').strip()
    template = (b.get('template') or 'classic').strip()
    data = json.dumps(b.get('data') or {}, ensure_ascii=False)

    db = get_db()
    cur = db.execute(
        'INSERT INTO resumes (user_id, title, template, data) VALUES (?, ?, ?, ?)',
        (g.user_id, title, template, data),
    )
    db.commit()
    row = db.execute('SELECT * FROM resumes WHERE id=?', (cur.lastrowid,)).fetchone()
    return ok(parse_resume_row(row)), 201


@app.route('/resumes/<int:rid>', methods=['GET'])
@require_auth
def get_resume(rid):
    db = get_db()
    row = db.execute(
        'SELECT * FROM resumes WHERE id=? AND user_id=?', (rid, g.user_id)
    ).fetchone()
    if not row:
        return err('Не знайдено', 404)
    return ok(parse_resume_row(row))


@app.route('/resumes/<int:rid>', methods=['PUT', 'PATCH'])
@require_auth
def update_resume(rid):
    db = get_db()
    row = db.execute(
        'SELECT * FROM resumes WHERE id=? AND user_id=?', (rid, g.user_id)
    ).fetchone()
    if not row:
        return err('Не знайдено', 404)

    b = request.get_json(silent=True) or {}
    title = b.get('title', row['title'])
    template = b.get('template', row['template'])

    if 'data' in b and isinstance(b['data'], dict):
        if request.method == 'PUT':
            new_data = b['data']
        else:
            try:
                existing = json.loads(row['data'])
            except Exception:
                existing = {}
            existing.update(b['data'])
            new_data = existing
    else:
        try:
            new_data = json.loads(row['data'])
        except Exception:
            new_data = {}

    db.execute(
        'UPDATE resumes SET title=?,template=?,data=?,updated_at=datetime("now") WHERE id=?',
        (title, template, json.dumps(new_data, ensure_ascii=False), rid),
    )
    db.commit()
    row = db.execute('SELECT * FROM resumes WHERE id=?', (rid,)).fetchone()
    return ok(parse_resume_row(row))


@app.route('/resumes/<int:rid>', methods=['DELETE'])
@require_auth
def delete_resume(rid):
    db = get_db()
    row = db.execute(
        'SELECT id FROM resumes WHERE id=? AND user_id=?', (rid, g.user_id)
    ).fetchone()
    if not row:
        return err('Не знайдено', 404)
    db.execute('DELETE FROM resumes WHERE id=?', (rid,))
    db.commit()
    return ok({'deleted': rid})


# NLP
class ResumeTokens(NamedTuple):
    skills_set: set[str]
    title_set: set[str]
    summary_set: set[str]
    experience_set: set[str]
    other_set: set[str]
    all_tokens: set[str]
    full_text: str


def resume_to_text(data):
    parts = []
    p = data.get('personal', {})
    parts.append(p.get('jobTitle', ''))
    parts.append(data.get('summary', ''))
    for exp in data.get('experience', []):
        parts += [exp.get('position', ''), exp.get('company', ''), exp.get('description', '')]
    for edu in data.get('education', []):
        parts += [edu.get('institution', ''), edu.get('degree', ''), edu.get('field', '')]
    parts += data.get('skills', [])
    for lang in data.get('languages', []):
        parts.append(lang.get('language', ''))
    for proj in data.get('projects', []):
        parts += [proj.get('name', ''), proj.get('description', '')]
    parts += list((data.get('links') or {}).values())
    return ' '.join(str(x) for x in parts if x)


def parse_resume_tokens(data: dict) -> ResumeTokens:
    p = data.get('personal', {})

    skills_tokens = set()
    for skill in data.get('skills', []):
        for tok in tokenize(str(skill)):
            skills_tokens.add(tok)
        norm = normalize_keyword(str(skill))
        if norm:
            skills_tokens.add(norm)

    title_tokens = set(tokenize(p.get('jobTitle', '')))

    summary_tokens = set(tokenize(data.get('summary', '')))

    exp_tokens = set()
    for exp in data.get('experience', []):
        for field in ('position', 'company', 'description'):
            for tok in tokenize(exp.get(field, '')):
                exp_tokens.add(tok)

    other_tokens = set()
    for edu in data.get('education', []):
        for field in ('institution', 'degree', 'field'):
            for tok in tokenize(edu.get(field, '')):
                other_tokens.add(tok)
    for lang in data.get('languages', []):
        other_tokens.add(normalize_keyword(lang.get('language', '')))
    for proj in data.get('projects', []):
        for field in ('name', 'description'):
            for tok in tokenize(proj.get(field, '')):
                other_tokens.add(tok)

    all_tokens = skills_tokens | title_tokens | summary_tokens | exp_tokens | other_tokens
    full_text = ' ' + ' '.join(sorted(all_tokens)) + ' '

    return ResumeTokens(
        skills_set=skills_tokens,
        title_set=title_tokens,
        summary_set=summary_tokens,
        experience_set=exp_tokens,
        other_set=other_tokens,
        all_tokens=all_tokens,
        full_text=full_text,
    )


# BM25-like keyword extraction

def bm25_keywords(job_text: str, top_n: int = 25) -> list[tuple[str, float]]:
    ALL_SKILLS = TECH_SKILLS | SOFT_SKILLS | BUSINESS_SKILLS

    tokens = tokenize(job_text, extra_stopwords=JOB_NOISE)
    total  = len(tokens)
    if total == 0:
        return []

    freq: Counter = Counter(tokens)
    for i in range(len(tokens) - 1):
        bigram = f'{tokens[i]} {tokens[i+1]}'
        if bigram in ALL_SKILLS:
            freq[bigram] = freq.get(bigram, 0) + 2
        if i < len(tokens) - 2:
            trigram = f'{tokens[i]} {tokens[i+1]} {tokens[i+2]}'
            if trigram in ALL_SKILLS:
                freq[trigram] = freq.get(trigram, 0) + 3
    expanded: dict[str, float] = {}
    for term, tf in freq.items():
        canonical = SYNONYMS.get(term, term)
        if canonical != term and canonical not in freq:
            expanded[canonical] = tf * 0.8  # slightly lower weight as it's inferred
    for term, tf in expanded.items():
        freq[term] = freq.get(term, 0) + tf

    scores: dict[str, float] = {}
    for term, tf in freq.items():
        tf_score = 1 + np.log(max(tf, 1))
        idf      = np.log((total + 1) / (tf + 1)) + 1
        score    = tf_score * idf

        if len(term) < 4:
            score *= 0.7
        if term in TECH_SKILLS:
            score *= 2.0
        elif term in SOFT_SKILLS or term in BUSINESS_SKILLS:
            score *= 1.5

        scores[term] = score

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return ranked[:top_n]


def _extract_required_years(job_text: str) -> int | None:
    patterns = [
        r'(\d+)\+?\s*(?:роки?|рік|років|years?)',
        r'від\s+(\d+)\s*(?:роки?|рік|років|years?)',
        r'(?:at least|minimum|мінімум)\s+(\d+)',
        r'(\d+)\s*–\s*\d+\s*(?:роки?|рік|років|years?)',
    ]
    found_years: list[int] = []
    text_lower = job_text.lower()
    for pattern in patterns:
        for match in re.finditer(pattern, text_lower):
            try:
                years = int(match.group(1))
                if 1 <= years <= 20:
                    found_years.append(years)
            except (ValueError, IndexError):
                pass
    return min(found_years) if found_years else None


def _count_resume_experience_years(resume_data: dict) -> float:
    import datetime
    total_months = 0
    now          = datetime.datetime.now()

    for exp in resume_data.get('experience', []):
        start_raw = exp.get('startDate', '')
        end_raw   = exp.get('endDate', '')
        is_current = exp.get('current', False)

        # Parse MM/YYYY or YYYY format
        def parse_date(raw):
            raw = (raw or '').strip()
            for fmt in ('%m/%Y', '%Y'):
                try:
                    return datetime.datetime.strptime(raw, fmt)
                except ValueError:
                    pass
            # Try just year
            m = re.match(r'(\d{4})', raw)
            if m:
                return datetime.datetime(int(m.group(1)), 1, 1)
            return None

        start = parse_date(start_raw)
        end   = now if is_current else parse_date(end_raw)

        if start and end and end >= start:
            delta = (end.year - start.year) * 12 + (end.month - start.month)
            total_months += max(0, delta)

    return round(total_months / 12, 1)


def build_keyword_candidates(job_text: str, limit: int = 20) -> list[str]:
    candidates: list[str] = []
    seen:       set[str]  = set()

    # 1. BM25 ranked — primary source
    for kw, _ in bm25_keywords(job_text, top_n=limit * 2):
        if kw and len(kw) > 2 and not re.match(r'^\d+', kw) and kw not in seen:
            candidates.append(kw)
            seen.add(kw)

    # 2. extract_keywords from nlp_data as supplement
    for item in extract_keywords(job_text, top_n=limit):
        word = (item.get('word') or '').strip()
        norm = normalize_keyword(word)
        if norm and len(norm) > 2 and norm not in seen and norm not in JOB_NOISE:
            candidates.append(norm)
            seen.add(norm)

    return candidates[:limit]




# Keyword matching

def keyword_match_score(keyword: str, resume: ResumeTokens) -> tuple[bool, float]:
    norm = normalize_keyword(keyword)
    if not norm:
        return False, 0.0

    is_phrase = ' ' in norm

    if is_phrase:
        parts = norm.split()
        if norm in resume.skills_set:
            return True, 1.0
        if all(p in resume.skills_set for p in parts):
            return True, 1.0
        if all(p in resume.experience_set for p in parts):
            return True, 0.75
        if all(p in resume.all_tokens for p in parts):
            return True, 0.6
        found_parts = sum(1 for p in parts if p in resume.all_tokens)
        if found_parts >= max(1, len(parts) - 1):
            return True, 0.35
        return False, 0.0
    if norm in resume.skills_set:
        return True, 1.0
    if norm in resume.title_set:
        return True, 0.9
    if norm in resume.experience_set:
        return True, 0.75
    if norm in resume.summary_set:
        return True, 0.6
    if norm in resume.other_set:
        return True, 0.4

    return False, 0.0


# Score calculation

def safe_cosine(v1: np.ndarray, v2: np.ndarray) -> float:
    denom = float(np.linalg.norm(v1) * np.linalg.norm(v2))
    if denom == 0:
        return 0.0
    return float(max(0.0, np.dot(v1, v2) / denom))


def compute_weighted_score(
    keywords:        list[str],
    found_items:     list[dict],
    missing_items:   list[dict],
    tfidf_cosine:    float,
    semantic_cosine: float | None,
    resume:          ResumeTokens,
    resume_data:     dict,
    job_text:        str = '',
) -> int:

    # Signal 1: Keyword coverage
    total_kw = max(len(keywords), 1)
    matched_weight = sum(item['weight'] for item in found_items)
    # Normalise: max possible weight = 1.0 per keyword (all found in skills)
    coverage_score = min(matched_weight / total_kw, 1.0)

    # Signal 2: Skills-section boost
    skills_matched = sum(1 for item in found_items if item.get('weight', 0) >= 1.0)
    skills_boost   = min(skills_matched / total_kw, 1.0)

    # Signal 3: Cosine similarity
    if semantic_cosine is not None:
        cosine_score = max(0.0, min((semantic_cosine - 0.15) / 0.75, 1.0))
    else:
        cosine_score = min(tfidf_cosine * 4.5, 1.0)

    # Signal 4: Experience depth
    experience        = resume_data.get('experience', [])
    exp_with_desc     = sum(1 for exp in experience if len(exp.get('description', '').strip()) > 40)
    if not experience:
        exp_depth = 0.0
    elif exp_with_desc == 0:
        exp_depth = 0.25
    elif exp_with_desc < len(experience):
        exp_depth = 0.6
    else:
        exp_depth = 1.0

    # Signal 5: Experience years match
    required_years  = _extract_required_years(job_text) if job_text else None
    resume_years    = _count_resume_experience_years(resume_data)

    if required_years is None:
        years_score = 0.7
    elif resume_years == 0:
        years_score = 0.0
    elif resume_years >= required_years:
        years_score = 1.0
    else:
        years_score = min(resume_years / required_years, 1.0) * 0.8

    # Combine
    combined = (
        coverage_score * 0.38 +
        skills_boost   * 0.18 +
        cosine_score   * 0.28 +
        exp_depth      * 0.08 +
        years_score    * 0.08
    )

    return max(0, min(100, round(combined * 100)))


# Verdict

def get_verdict(score: int) -> str:
    if score >= 80: return 'Ідеальний збіг'
    if score >= 65: return 'Гарна відповідність'
    if score >= 50: return 'Середня відповідність'
    if score >= 35: return 'Низька відповідність'
    return 'Потребує доопрацювання'


# Keyword classification

def classify_keywords(kw_list: list[dict]) -> dict:
    tech = [item for item in kw_list if item['word'] in TECH_SKILLS]
    soft = [item for item in kw_list if item['word'] in SOFT_SKILLS]
    business = [item for item in kw_list if item['word'] in BUSINESS_SKILLS]

    return {
        'tech': tech,
        'soft': soft,
        'business': business,
    }


# Smart recommendations

def build_recommendations(
    score:         int,
    found_items:   list[dict],
    missing_items: list[dict],
    keywords:      list[str],
    resume_data:   dict,
    job_text:      str = '',
) -> list[dict]:
    recs: list[dict] = []
    seen: set[str]   = set()

    def add(level: str, word: str, text: str):
        if text not in seen:
            recs.append({'level': level, 'word': word, 'text': text})
            seen.add(text)

    found_cat   = classify_keywords(found_items)
    missing_cat = classify_keywords(missing_items)

    total_kw     = max(len(keywords), 1)
    coverage_pct = round(len(found_items) / total_kw * 100)

    required_years = _extract_required_years(job_text) if job_text else None
    resume_years   = _count_resume_experience_years(resume_data)
    if required_years is not None:
        if resume_years == 0:
            add('red', '',
                f'Вакансія вимагає {required_years}+ {_years_label(required_years)} досвіду, '
                f'але розділ «Досвід» порожній або без дат. Заповніть дати роботи.')
        elif resume_years < required_years:
            add('yellow', '',
                f'Вакансія вимагає {required_years}+ {_years_label(required_years)}, '
                f'у вашому резюме — ~{resume_years:.0f} {_years_label(resume_years)}. '
                f'Додайте релевантні проєкти або фріланс щоб компенсувати різницю.')
        else:
            add('green', '',
                f'Ваш досвід (~{resume_years:.0f} {_years_label(resume_years)}) '
                f'відповідає вимогам вакансії.')

    missing_tech = missing_cat['tech']
    if len(missing_tech) >= 5:
        skills_str = ', '.join(f'«{m["word"]}»' for m in missing_tech[:4])
        add('red', '',
            f'Відсутні технічні навички: {skills_str} та ін. '
            f'Покриття вимог: {coverage_pct}% — резюме потребує суттєвого доповнення.')
    elif missing_tech:
        for tech in missing_tech[:3]:
            add('red', tech['word'],
                f'Додайте «{tech["word"]}» до розділу «Навички» — це пряма вимога вакансії.')

    for soft in missing_cat['soft'][:2]:
        add('yellow', soft['word'],
            f'Згадайте «{soft["word"]}» в описі досвіду або розділі «Про себе».')

    for biz in missing_cat['business'][:1]:
        add('yellow', biz['word'],
            f'«{biz["word"]}» — важлива компетенція для цієї позиції.')

    found_tech = found_cat['tech']
    if found_tech:
        skills_str = ', '.join(f['word'] for f in found_tech[:5])
        suffix     = ' та інші' if len(found_tech) > 5 else ''
        add('green', '',
            f'Технічні навички ({skills_str}{suffix}) відповідають вимогам вакансії.')

    # Summary quality
    summary = (resume_data.get('summary') or '').strip()
    if len(summary) < 50:
        add('yellow', '',
            'Додайте розділ «Про себе» (2–4 речення з ключовими технологіями і досягненнями) — '
            'це суттєво підвищує релевантність для ATS-систем.')
    elif len(summary) < 150:
        add('yellow', '',
            'Розширте «Про себе» до 3–5 речень: включіть ключові технології зі списку вакансії і конкретні досягнення.')

    # Experience descriptions
    experience  = resume_data.get('experience', [])
    empty_descs = [exp for exp in experience if len(exp.get('description', '').strip()) < 40]
    if not experience:
        add('red', '',
            'Розділ «Досвід» порожній — заповніть хоча б один запис або додайте проєкти.')
    elif empty_descs:
        count = len(empty_descs)
        add('yellow', '',
            f'Додайте опис обов\'язків для {count} '
            f'{"запису" if count == 1 else "записів"} досвіду — '
            f'це підвищує score в ATS і показує глибину компетенцій.')

    # Score-based overall advice
    if score >= 80:
        add('green', '', 'Відмінна відповідність вакансії — резюме готове до відправки.')
    elif score >= 65:
        add('green', '', 'Хороша відповідність — можна відправляти після дрібних доповнень.')
    elif score >= 50:
        add('yellow', '',
            f'Середня відповідність ({score}%). Додайте відсутні навички та розгорніть досвід.')
    elif score >= 35:
        add('yellow', '',
            f'Низька відповідність ({score}%). Адаптуйте summary і навички під конкретну вакансію.')
    else:
        add('red', '',
            f'Критична невідповідність ({score}%). Резюме потребує значного переопрацювання під цю вакансію.')

    return recs


def _years_label(years: float) -> str:
    n = int(years)
    if 11 <= n % 100 <= 19:
        return 'років'
    r = n % 10
    if r == 1:
        return 'рік'
    if 2 <= r <= 4:
        return 'роки'
    return 'років'


# Load resume data helper
def _load_resume_data(rid, user_id):
    db  = get_db()
    row = db.execute(
        'SELECT data FROM resumes WHERE id=? AND user_id=?', (rid, user_id)
    ).fetchone()
    if not row:
        return None, None
    try:
        data = json.loads(row['data'])
    except Exception:
        data = {}
    return data, resume_to_text(data)


# Local analysis
@app.route('/resumes/<int:rid>/analyze', methods=['POST'])
@require_auth
def analyze_resume(rid):
    resume_data, resume_text = _load_resume_data(rid, g.user_id)
    if resume_data is None:
        return err('Резюме не знайдено', 404)

    b        = request.get_json(silent=True) or {}
    job_text = (b.get('jobText') or '').strip()
    if len(job_text) < 20:
        return err('Текст вакансії занадто короткий')
    if len((resume_text or '').strip()) < 20:
        return err('Резюме майже пусте. Заповніть дані.')

    resume = parse_resume_tokens(resume_data)
    keywords = build_keyword_candidates(job_text, limit=20)

    found_items:   list[dict] = []
    missing_items: list[dict] = []

    for kw in keywords:
        matched, weight = keyword_match_score(kw, resume)
        entry = {'word': kw, 'weight': weight}
        if matched:
            found_items.append(entry)
        else:
            missing_items.append(entry)

    # Cosine similarity
    semantic_cosine: float | None = None
    tfidf_cosine:    float        = 0.0
    method = 'local-bm25'

    model = get_semantic_model()
    if model:
        try:
            embeddings = model.encode([resume_text, job_text])
            semantic_cosine = safe_cosine(embeddings[0], embeddings[1])
            method = 'local-semantic+bm25'
        except Exception as exc:
            print(f'[AI] encode failed: {exc}')

    if semantic_cosine is None:
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity as sk_cosine

            norm_resume = ' '.join(tokenize(resume_text))
            norm_job = ' '.join(tokenize(job_text))

            if norm_resume and norm_job:
                tfidf_mat = TfidfVectorizer(
                    ngram_range=(1, 2), max_features=2000, sublinear_tf=True
                ).fit_transform([norm_resume, norm_job])
                tfidf_cosine = float(sk_cosine(tfidf_mat[0:1], tfidf_mat[1:2])[0][0])
        except Exception as exc:
            print(f'[NLP] TF-IDF failed: {exc}')
        method = 'local-tfidf+bm25'

    # Weighted score
    score = compute_weighted_score(
        keywords = keywords,
        found_items = found_items,
        missing_items = missing_items,
        tfidf_cosine = tfidf_cosine,
        semantic_cosine = semantic_cosine,
        resume = resume,
        resume_data = resume_data,
        job_text = job_text,
    )

    # Recommendations
    recs = build_recommendations(
        score = score,
        found_items = found_items,
        missing_items = missing_items,
        keywords = keywords,
        resume_data = resume_data,
        job_text = job_text,
    )

    found_cat   = classify_keywords(found_items)
    missing_cat = classify_keywords(missing_items)

    return ok({
        'score': score,
        'verdict': get_verdict(score),
        'found': [{'word': f['word']} for f in found_items[:10]],
        'missing': [{'word': m['word']} for m in missing_items[:8]],
        'found_tech': found_cat['tech'],
        'found_soft': found_cat['soft'],
        'found_business': found_cat['business'],
        'missing_tech': missing_cat['tech'],
        'missing_soft': missing_cat['soft'],
        'missing_business': missing_cat['business'],
        'recommendations': recs,
        'method': method,
        'debug': {
            'keywords_total': len(keywords),
            'keywords_found': len(found_items),
            'coverage_pct': round(len(found_items) / max(len(keywords), 1) * 100),
            'tfidf_cosine': round(tfidf_cosine, 4),
            'semantic_cosine': round(semantic_cosine, 4) if semantic_cosine is not None else None,
            'required_years': _extract_required_years(job_text),
            'resume_years': _count_resume_experience_years(resume_data),
        },
        'modelStatus': {
            'loading': _model_loading,
            'ready': _model_loaded,
            'warning': 'ШІ-модель завантажується. Наступний аналіз буде точнішим.' if _model_loading else None,
        },
    })


# Gemini analysis
def _call_gemini(prompt):
    import requests as req_lib
    import time

    # Status codes that mean «skip to next model»
    SKIP_CODES = {429, 404, 503}

    request_body = {
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {
            'temperature': 0.1,
            'maxOutputTokens': 4096,
            'topP': 0.9,
        },
    }

    for model in GEMINI_MODELS:
        url = f'{GEMINI_BASE_URL}/{model}:generateContent?key={GEMINI_KEY}'
        try:
            print(f'[Gemini] Спроба {model}...')
            resp = req_lib.post(url, json=request_body, timeout=45)

            # HTTP 400
            if resp.status_code == 400:
                try:
                    reason = resp.json().get('error', {}).get('message', resp.text[:120])
                except Exception:
                    reason = resp.text[:120]
                print(f'[Gemini] {model}: HTTP 400 — {reason}')
                continue

            # Rate limit / not found / service unavailable
            if resp.status_code in SKIP_CODES:
                try:
                    reason = resp.json().get('error', {}).get('message', '')
                except Exception:
                    reason = resp.text[:120]
                print(f'[Gemini] {model}: HTTP {resp.status_code} — {reason}')
                continue

            # Retry 500 once
            if resp.status_code == 500:
                print(f'[Gemini] {model}: HTTP 500 — retry in 2s...')
                time.sleep(2)
                resp = req_lib.post(url, json=request_body, timeout=45)
                if not resp.ok:
                    print(f'[Gemini] {model}: retry failed {resp.status_code}')
                    continue

            # Success
            if resp.ok:
                try:
                    data = resp.json()
                except Exception as exc:
                    print(f'[Gemini] {model}: не вдалося розпарсити JSON відповідь — {exc}')
                    continue

                candidates   = data.get('candidates') or []
                prompt_fb    = data.get('promptFeedback') or {}
                block_reason = prompt_fb.get('blockReason', '')

                if block_reason:
                    print(f'[Gemini] {model}: заблоковано — {block_reason}')
                    continue

                if not candidates:
                    print(f'[Gemini] {model}: порожній candidates, дані: {str(data)[:200]}')
                    continue

                finish = candidates[0].get('finishReason', 'STOP')
                if finish in ('SAFETY', 'RECITATION', 'OTHER'):
                    print(f'[Gemini] {model}: finishReason={finish}')
                    continue

                print(f'[Gemini] Успішно: {model} (finishReason={finish})')
                return data, model

            print(f'[Gemini] {model}: HTTP {resp.status_code}')

        except req_lib.exceptions.Timeout:
            print(f'[Gemini] {model}: timeout (45s)')
        except req_lib.exceptions.ConnectionError as exc:
            print(f'[Gemini] {model}: connection error — {exc}')
        except Exception as exc:
            print(f'[Gemini] {model}: unexpected error — {exc}')

    return None, None


def _clean_json_string(text):
    # 1. Strip markdown fences
    md = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', text, re.IGNORECASE)
    if md:
        text = md.group(1)

    # 2. Remove JS-style comments
    text = re.sub(r'//[^\n]*',     '',  text)
    text = re.sub(r'/\*[\s\S]*?\*/', '', text)

    # 3. Remove trailing commas  (,  followed by ] or })
    text = re.sub(r',\s*([}\]])', r'\1', text)

    # 4. Extract outermost { ... }
    raw = re.search(r'\{[\s\S]*\}', text)
    return raw.group(0) if raw else ''


def _parse_gemini(data: dict) -> dict:
    candidates = data.get('candidates') or []
    if not candidates:
        feedback = data.get('promptFeedback', {})
        block    = feedback.get('blockReason', '')
        raise ValueError(f'Gemini заблокував запит: {block or "невідома причина"}')

    candidate = candidates[0]
    finish    = candidate.get('finishReason', '')
    if finish in ('SAFETY', 'RECITATION', 'OTHER'):
        raise ValueError(f'Gemini відмовив через: {finish}')
    if finish == 'MAX_TOKENS':
        print('[Gemini] WARNING: відповідь обрізана (MAX_TOKENS) — спробуємо розпарсити частину')

    text = (
        candidate
        .get('content', {})
        .get('parts', [{}])[0]
        .get('text', '')
    )

    if not text or not text.strip():
        raise ValueError('Gemini повернув порожню відповідь')
    json_str = _clean_json_string(text)
    if not json_str:
        raise ValueError(f'Не вдалося знайти JSON у відповіді Gemini. Отримано: {text[:200]!r}')

    try:
        result = json.loads(json_str)
    except json.JSONDecodeError as exc:
        raise ValueError(f'Некоректний JSON від Gemini: {exc}. Фрагмент: {json_str[:300]!r}')
    if not isinstance(result, dict):
        raise ValueError('Gemini повернув не об\'єкт JSON')

    result['score'] = max(0, min(100, round(float(result.get('score') or 0))))
    result['verdict'] = str(result.get('verdict') or 'Аналіз завершено')
    result['found'] = [
        item for item in (result.get('found') or [])
        if isinstance(item, dict) and item.get('word')
    ][:10]
    result['missing'] = [
        item for item in (result.get('missing') or [])
        if isinstance(item, dict) and item.get('word')
    ][:8]
    result['recommendations'] = [
        item for item in (result.get('recommendations') or [])
        if isinstance(item, dict)
           and item.get('level') in ('red', 'yellow', 'green')
           and item.get('text')
    ]

    return result


_GEMINI_PROMPT = """\
Ти — ATS-система. Проаналізуй відповідність резюме до вакансії.
Відповідай ТІЛЬКИ JSON без пояснень, без markdown, без коментарів.

РЕЗЮМЕ:
{resume}

ВАКАНСІЯ:
{job}

JSON-структура відповіді:
{{"score":0,"verdict":"","found":[{{"word":""}}],"missing":[{{"word":""}}],"recommendations":[{{"level":"","word":"","text":""}}]}}

Правила заповнення:
- score: ціле число 0-100. Ваги: технічні навички 50%, досвід 30%, освіта 10%, soft skills 10%
- verdict: 3-5 слів українською (наприклад "Гарна відповідність вакансії")
- found: до 8 ключових слів/навичок що є в резюме
- missing: до 6 важливих вимог яких НЕМАЄ в резюме
- recommendations: 3-5 порад. level: "red"=критично, "yellow"=бажано, "green"=добре. word: навичка або ""
- Не вигадуй навички яких немає в резюме
- Відповідай лише JSON, нічого більше"""


@app.route('/resumes/<int:rid>/analyze/gemini', methods=['POST'])
@require_auth
def analyze_resume_gemini(rid):
    if not GEMINI_KEY:
        return err('Gemini API ключ не налаштовано на сервері', 503)

    resume_data, resume_text = _load_resume_data(rid, g.user_id)
    if resume_data is None:
        return err('Резюме не знайдено', 404)

    b        = request.get_json(silent=True) or {}
    job_text = (b.get('jobText') or '').strip()
    if len(job_text) < 20:
        return err('Текст вакансії занадто короткий')
    if len((resume_text or '').strip()) < 20:
        return err('Резюме майже пусте. Заповніть дані.')

    prompt = _GEMINI_PROMPT.format(resume=resume_text, job=job_text)
    data, model = _call_gemini(prompt)

    if not data:
        return err('Усі моделі Gemini недоступні. Використовується локальний аналіз.', 503)

    try:
        result = _parse_gemini(data)
    except ValueError as exc:
        print(f'[Gemini] Parse error: {exc}')
        return err(f'Gemini повернув некоректну відповідь: {exc}', 502)
    except json.JSONDecodeError as exc:
        print(f'[Gemini] JSON decode error: {exc}')
        return err(f'Помилка розбору відповіді Gemini: {exc}', 502)

    result['method'] = f'gemini-{model}' if model else 'gemini'
    return ok(result)


# Entry point
if __name__ == '__main__':
    print('=' * 52)
    print('  Сервер: http://localhost:5000')
    print(f"  Gemini: {'активовано' if GEMINI_KEY else 'не налаштовано'}")
    print('=' * 52)
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', '5000')), debug=False)