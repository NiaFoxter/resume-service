import json, os, re, sqlite3
from datetime import datetime, timedelta, timezone
from functools import wraps
from collections import Counter

from dotenv import load_dotenv
load_dotenv()

import jwt
import numpy as np
from flask import Flask, request, jsonify, g, send_from_directory
from flask.wrappers import Response
from werkzeug.security import generate_password_hash, check_password_hash

from nlp_data import (
    STOPWORDS_ALL,
    SYNONYMS,
    TECH_SKILLS,
    SOFT_SKILLS,
    BUSINESS_SKILLS,
    extract_keywords,
)


# App config
app = Flask(__name__, static_folder=None)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-in-prod')
app.config['JWT_EXPIRE_HOURS'] = int(os.environ.get('JWT_EXPIRE_HOURS', '24'))

DB_PATH        = os.path.join(os.path.dirname(__file__), 'resume.db')
FRONTEND_DIR   = os.path.join(os.path.dirname(__file__), '..', 'dist')
GEMINI_KEY     = os.environ.get('GEMINI_KEY', '')
GEMINI_MODELS  = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-3.1-flash-lite',

]
GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

# Semantic model (lazy)
_model         = None
_model_loading = False
_model_loaded  = False
_MODEL_NAME    = 'paraphrase-multilingual-MiniLM-L12-v2'


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
def add_cors_and_mime(r: Response):
    r.headers['Access-Control-Allow-Origin']  = '*'
    r.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    r.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'

    ext_mime = {
        '.js': 'application/javascript', '.mjs': 'application/javascript',
        '.css': 'text/css', '.wasm': 'application/wasm',
        '.json': 'application/json', '.html': 'text/html',
    }
    for ext, mime in ext_mime.items():
        if request.path.endswith(ext):
            r.headers['Content-Type'] = mime
            break
    return r


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
            g.email   = payload['email']
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
    b          = request.get_json(silent=True) or {}
    email      = (b.get('email') or '').strip().lower()
    password   = (b.get('password') or '').strip()
    first_name = (b.get('firstName') or '').strip()
    last_name  = (b.get('lastName') or '').strip()

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
        'INSERT INTO users (email,password,first_name,last_name) VALUES (?,?,?,?)',
        (email, generate_password_hash(password), first_name, last_name),
    )
    db.commit()
    uid = cur.lastrowid
    return ok({
        'token':     make_token(uid, email),
        'userId':    uid,
        'firstName': first_name,
        'lastName':  last_name,
    }), 201


@app.route('/auth/login', methods=['POST'])
def login():
    b        = request.get_json(silent=True) or {}
    email    = (b.get('email') or '').strip().lower()
    password = (b.get('password') or '').strip()

    if not email or not password:
        return err('Вкажіть пошту та пароль')

    db   = get_db()
    user = db.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
    if not user or not check_password_hash(user['password'], password):
        return err('Невірна пошта або пароль', 401)

    return ok({
        'token':     make_token(user['id'], email),
        'userId':    user['id'],
        'firstName': user['first_name'],
        'lastName':  user['last_name'],
    })


@app.route('/auth/me', methods=['GET'])
@require_auth
def me():
    db   = get_db()
    user = db.execute(
        'SELECT id,email,first_name,last_name,created_at FROM users WHERE id=?',
        (g.user_id,),
    ).fetchone()
    if not user:
        return err('Не знайдено', 404)
    return ok(dict(user))


# Resume CRUD
@app.route('/resumes', methods=['GET'])
@require_auth
def list_resumes():
    db   = get_db()
    rows = db.execute(
        'SELECT id,title,template,updated_at,created_at FROM resumes'
        ' WHERE user_id=? ORDER BY updated_at DESC',
        (g.user_id,),
    ).fetchall()
    return ok([dict(r) for r in rows])


@app.route('/resumes', methods=['POST'])
@require_auth
def create_resume():
    b        = request.get_json(silent=True) or {}
    title    = (b.get('title') or 'Нове резюме').strip()
    template = (b.get('template') or 'classic').strip()
    data     = json.dumps(b.get('data') or {}, ensure_ascii=False)

    db  = get_db()
    cur = db.execute(
        'INSERT INTO resumes (user_id,title,template,data) VALUES (?,?,?,?)',
        (g.user_id, title, template, data),
    )
    db.commit()
    row = db.execute('SELECT * FROM resumes WHERE id=?', (cur.lastrowid,)).fetchone()
    return ok(parse_resume_row(row)), 201


@app.route('/resumes/<int:rid>', methods=['GET'])
@require_auth
def get_resume(rid):
    db  = get_db()
    row = db.execute(
        'SELECT * FROM resumes WHERE id=? AND user_id=?', (rid, g.user_id)
    ).fetchone()
    if not row:
        return err('Не знайдено', 404)
    return ok(parse_resume_row(row))


@app.route('/resumes/<int:rid>', methods=['PUT', 'PATCH'])
@require_auth
def update_resume(rid):
    db  = get_db()
    row = db.execute(
        'SELECT * FROM resumes WHERE id=? AND user_id=?', (rid, g.user_id)
    ).fetchone()
    if not row:
        return err('Не знайдено', 404)

    b        = request.get_json(silent=True) or {}
    title    = b.get('title', row['title'])
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
    db  = get_db()
    row = db.execute(
        'SELECT id FROM resumes WHERE id=? AND user_id=?', (rid, g.user_id)
    ).fetchone()
    if not row:
        return err('Не знайдено', 404)
    db.execute('DELETE FROM resumes WHERE id=?', (rid,))
    db.commit()
    return ok({'deleted': rid})


# NLP helpers
def tokenize(text):
    tokens = re.findall(r'[a-zа-яіїєґ][a-zа-яіїєґ0-9+#.\-]*', text.lower())
    result = []
    for t in tokens:
        t = t.strip('.-_')
        if len(t) < 2:
            continue
        t = SYNONYMS.get(t, t)
        if t not in STOPWORDS_ALL:
            result.append(t)
    return result


def resume_to_text(data):
    parts = []
    p = data.get('personal', {})
    parts.append(p.get('jobTitle', ''))
    parts.append(data.get('summary', ''))
    for e in data.get('experience', []):
        parts += [e.get('position', ''), e.get('company', ''), e.get('description', '')]
    for e in data.get('education', []):
        parts += [e.get('institution', ''), e.get('degree', ''), e.get('field', '')]
    parts += data.get('skills', [])
    for lang in data.get('languages', []):
        parts.append(lang.get('language', ''))
    for pr in data.get('projects', []):
        parts += [pr.get('name', ''), pr.get('description', '')]
    parts += list((data.get('links') or {}).values())
    return ' '.join(str(x) for x in parts if x)


def get_verdict(score):
    if score >= 80: return 'Ідеальний збіг'
    if score >= 65: return 'Гарна відповідність'
    if score >= 50: return 'Середня відповідність'
    if score >= 35: return 'Низька відповідність'
    return 'Потребує доопрацювання'


def _valid_keyword(kw):
    return bool(kw and len(kw) > 2 and not re.match(r'^\d+[+\-]?\d*$', kw))


def build_keyword_candidates(job_text, limit=15):
    candidates, seen = [], set()
    for item in extract_keywords(job_text, top_n=limit * 2):
        w = (item.get('word') or '').strip()
        if _valid_keyword(w) and w not in seen:
            candidates.append(w); seen.add(w)
    for w, _ in Counter(tokenize(job_text)).most_common(limit * 2):
        if _valid_keyword(w) and w not in seen:
            candidates.append(w); seen.add(w)
    return candidates[:limit]


def keyword_in_resume(keyword, resume_tokens, resume_text_joined):
    normalized = ' '.join(tokenize(keyword))
    if not normalized:
        return False
    if ' ' in normalized:
        return normalized in resume_text_joined
    return normalized in resume_tokens


def safe_cosine(v1, v2):
    denom = np.linalg.norm(v1) * np.linalg.norm(v2)
    if denom == 0:
        return 0
    return int(max(0, np.dot(v1, v2) / denom) * 100)


def _classify_keywords(kw_list):
    return {
        'tech':     [k for k in kw_list if k['word'] in TECH_SKILLS],
        'soft':     [k for k in kw_list if k['word'] in SOFT_SKILLS],
        'business': [k for k in kw_list if k['word'] in BUSINESS_SKILLS],
    }


def _build_recommendations(score, found_cat, missing_cat):
    recs, seen = [], set()

    def add(level, word, text):
        if text not in seen:
            recs.append({'level': level, 'word': word, 'text': text})
            seen.add(text)

    for m in missing_cat['tech'][:3]:
        add('red', m['word'], f'Додайте "{m["word"]}" у розділ навичок — це ключова вимога')
    for m in missing_cat['soft'][:2]:
        add('yellow', m['word'], f'Згадайте "{m["word"]}" в описі досвіду або «Про себе»')
    for m in missing_cat['business'][:1]:
        add('yellow', m['word'], f'Додайте "{m["word"]}" — це важливо для цієї позиції')

    if found_cat['tech']:
        skills = ', '.join(f['word'] for f in found_cat['tech'][:4])
        add('green', '', f'Ваші технічні навички ({skills}) відповідають вакансії')

    score_advice = {
        80: ('green', 'Ваше резюме має дуже високу відповідність вакансії.'),
        65: ('green', 'Хороша відповідність — резюме можна використовувати для відгуку.'),
        50: ('yellow', 'Додайте більше ключових навичок і конкретики з вимог вакансії.'),
        35: ('yellow', 'Адаптуйте резюме під вимоги вакансії.'),
         0: ('red',    'Резюме потребує значного доопрацювання під цю вакансію.'),
    }
    for threshold in sorted(score_advice, reverse=True):
        if score >= threshold:
            level, text = score_advice[threshold]
            add(level, '', text)
            break

    return recs


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
    if len(resume_text.strip()) < 20:
        return err('Резюме майже пусте. Заповніть дані.')

    model = get_semantic_model()
    if model:
        emb    = model.encode([resume_text, job_text])
        score  = safe_cosine(emb[0], emb[1])
        method = 'semantic'
    else:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        norm_r = ' '.join(tokenize(resume_text))
        norm_j = ' '.join(tokenize(job_text))
        try:
            tfidf = TfidfVectorizer(ngram_range=(1, 2), max_features=1000).fit_transform([norm_r, norm_j])
            score = int(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0] * 100)
        except Exception:
            score = 0
        method = 'tfidf'

    top_kw             = build_keyword_candidates(job_text, limit=15)
    resume_tokens      = set(tokenize(resume_text))
    resume_text_joined = ' '.join(resume_tokens)

    found, missing = [], []
    for kw in top_kw:
        (found if keyword_in_resume(kw, resume_tokens, resume_text_joined) else missing).append({'word': kw})

    found_cat   = _classify_keywords(found)
    missing_cat = _classify_keywords(missing)
    recs        = _build_recommendations(score, found_cat, missing_cat)

    return ok({
        'score':            score,
        'verdict':          get_verdict(score),
        'found':            found[:8],
        'missing':          missing[:8],
        'found_tech':       found_cat['tech'],
        'found_soft':       found_cat['soft'],
        'found_business':   found_cat['business'],
        'missing_tech':     missing_cat['tech'],
        'missing_soft':     missing_cat['soft'],
        'recommendations':  recs,
        'method':           method,
        'modelStatus': {
            'loading': _model_loading,
            'ready':   _model_loaded,
            'warning': 'ШІ-модель завантажується вперше. Наступний аналіз буде швидшим.' if _model_loading else None,
        },
    })


# Gemini analysis
def _call_gemini(prompt):
    import requests as req_lib
    for model in GEMINI_MODELS:
        url = f'{GEMINI_BASE_URL}/{model}:generateContent?key={GEMINI_KEY}'
        try:
            print(f'[Gemini] Спроба {model}...')
            resp = req_lib.post(
                url,
                json={
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {
                        'temperature': 0.2,
                        'maxOutputTokens': 4096,
                        'topP': 0.95,
                    },
                },
                timeout=30,
            )
            if resp.status_code in (429, 404):
                print(f'[Gemini] {model}: {resp.status_code}')
                continue
            if resp.ok:
                print(f'[Gemini] Успішно: {model}')
                return resp.json(), model
        except Exception as e:
            print(f'[Gemini] {model}: {e}')
    return None, None


def _parse_gemini(data):
    text = (
        data.get('candidates', [{}])[0]
            .get('content', {})
            .get('parts', [{}])[0]
            .get('text', '')
    )
    if not text:
        raise ValueError('Gemini повернув порожню відповідь')

    md = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', text)
    json_str = md.group(1) if md else text
    raw = re.search(r'\{[\s\S]*\}', json_str)
    if not raw:
        raise ValueError('Gemini повернув некоректну відповідь')

    result = json.loads(raw.group(0))
    result['score']           = max(0, min(100, round(result.get('score', 0))))
    result['verdict']         = result.get('verdict', 'OK')
    result['found']           = (result.get('found') or [])[:10]
    result['missing']         = (result.get('missing') or [])[:8]
    result['recommendations'] = result.get('recommendations') or []
    return result


_GEMINI_PROMPT = """Ти — експерт з HR та ATS-систем. Проаналізуй відповідність резюме до вакансії.

РЕЗЮМЕ:
{resume}

ВАКАНСІЯ:
{job}

Дай відповідь ТІЛЬКИ валідним JSON (без markdown, без пояснень):
{{
  "score": число від 0 до 100,
  "verdict": "коротка оцінка 3-5 слів українською",
  "found": [{{"word": "ключове слово"}}],
  "missing": [{{"word": "ключове слово"}}],
  "recommendations": [
    {{"level": "red|yellow|green", "word": "слово або ''", "text": "конкретна порада українською"}}
  ]
}}

Правила:
- score: технічні навички (50%), досвід (30%), освіта (10%), м'які навички (10%)
- found: до 10 найважливіших слів/навичок, що РЕАЛЬНО є в резюме
- missing: до 8 важливих вимог вакансії, яких НЕМАЄ в резюме
- recommendations: 3-6 конкретних порад (red=критично, yellow=бажано, green=добре)
- НЕ вигадуй навички, яких немає в резюме"""


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
    if len(resume_text.strip()) < 20:
        return err('Резюме майже пусте. Заповніть дані.')

    prompt       = _GEMINI_PROMPT.format(resume=resume_text, job=job_text)
    data, model  = _call_gemini(prompt)
    if not data:
        return err('Усі моделі Gemini недоступні. Спробуйте локальний аналіз.', 503)

    try:
        result = _parse_gemini(data)
    except (ValueError, json.JSONDecodeError) as e:
        return err(str(e), 502)

    result['method'] = f'gemini-{model}' if model else 'gemini'
    return ok(result)


# Entry point
if __name__ == '__main__':
    print('=' * 52)
    print('  Сервер: http://localhost:5000')
    print(f"  Gemini: {'активовано' if GEMINI_KEY else 'не налаштовано'}")
    print('=' * 52)
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', '5000')), debug=False)