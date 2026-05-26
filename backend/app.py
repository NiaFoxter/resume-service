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
app.config['JWT_EXPIRE_HOURS'] = 24
DB_PATH = os.path.join(os.path.dirname(__file__), 'resume.db')

# Шлях до зібраного фронтенду
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'dist')

# Gemini config
GEMINI_KEY = os.environ.get('GEMINI_KEY', '')
GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3-flash',
]
GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

# Sentence-transformers model
_model = None
_MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'
_model_loading = False
_model_loaded = False


def get_semantic_model():
    """Lazy-load semantic model. If it is unavailable, local TF-IDF analysis is used."""
    global _model, _model_loading, _model_loaded

    if _model is None and not _model_loading:
        try:
            from sentence_transformers import SentenceTransformer
            _model_loading = True
            print(f"[AI] Завантаження моделі {_MODEL_NAME}...")
            _model = SentenceTransformer(_MODEL_NAME)
            _model_loaded = True
            print("[AI] Модель готова")
        except ImportError:
            print("[Система] sentence-transformers не встановлено. Використовується базовий аналіз.")
            _model = None
            _model_loaded = False
        except Exception as exc:
            print(f"[Система] Не вдалося завантажити semantic-модель: {exc}. Використовується TF-IDF.")
            _model = None
            _model_loaded = False
        finally:
            _model_loading = False

    return _model


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    full_path = os.path.join(FRONTEND_DIR, path)

    if path and os.path.exists(full_path):
        return send_from_directory(FRONTEND_DIR, path)

    index_path = os.path.join(FRONTEND_DIR, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(FRONTEND_DIR, 'index.html')

    return jsonify({
        'ok': False,
        'error': 'Збірку фронтенду не знайдено. Запустіть npm run build і перевірте папку dist.'
    }), 404


# CORS
@app.after_request
def add_cors_and_mime(r: Response):
    r.headers['Access-Control-Allow-Origin'] = '*'
    r.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    r.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'

    path = request.path

    if path.endswith(('.js', '.mjs')):
        r.headers['Content-Type'] = 'application/javascript'
    elif path.endswith('.css'):
        r.headers['Content-Type'] = 'text/css'
    elif path.endswith('.wasm'):
        r.headers['Content-Type'] = 'application/wasm'
    elif path.endswith('.json'):
        r.headers['Content-Type'] = 'application/json'
    elif path.endswith('.html'):
        r.headers['Content-Type'] = 'text/html'

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
    print(f"[DB] {DB_PATH}")


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
    def d(*a, **kw):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'Токен відсутній'}), 401

        try:
            p = jwt.decode(auth[7:], app.config['SECRET_KEY'], algorithms=['HS256'])
            g.user_id = int(p['sub'])
            g.email = p['email']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Токен прострочено'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Недійсний токен'}), 401

        return f(*a, **kw)

    return d


def ok(data=None, **kw):
    b = {'ok': True}
    if data is not None:
        b['data'] = data
    b.update(kw)
    return jsonify(b)


def err(msg, code=400):
    return jsonify({'ok': False, 'error': msg}), code


def parse_row(row):
    if not row:
        return None

    r = dict(row)
    try:
        r['data'] = json.loads(r['data'])
    except Exception:
        r['data'] = {}
    return r


# Auth routes
@app.route('/auth/register', methods=['POST'])
def register():
    b = request.get_json(silent=True) or {}
    email = (b.get('email') or '').strip().lower()
    password = (b.get('password') or '').strip()
    first_name = (b.get('firstName') or '').strip()
    last_name = (b.get('lastName') or '').strip()

    if not email or not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
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

    db = get_db()
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
    db = get_db()
    rows = db.execute(
        'SELECT id,title,template,updated_at,created_at FROM resumes WHERE user_id=? ORDER BY updated_at DESC',
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
        'INSERT INTO resumes (user_id,title,template,data) VALUES (?,?,?,?)',
        (g.user_id, title, template, data),
    )
    db.commit()
    return ok(parse_row(db.execute('SELECT * FROM resumes WHERE id=?', (cur.lastrowid,)).fetchone())), 201


@app.route('/resumes/<int:rid>', methods=['GET'])
@require_auth
def get_resume(rid):
    db = get_db()
    row = db.execute('SELECT * FROM resumes WHERE id=? AND user_id=?', (rid, g.user_id)).fetchone()
    if not row:
        return err('Не знайдено', 404)
    return ok(parse_row(row))


@app.route('/resumes/<int:rid>', methods=['PUT', 'PATCH'])
@require_auth
def update_resume(rid):
    db = get_db()
    row = db.execute('SELECT * FROM resumes WHERE id=? AND user_id=?', (rid, g.user_id)).fetchone()
    if not row:
        return err('Не знайдено', 404)

    b = request.get_json(silent=True) or {}
    title = b.get('title', row['title'])
    template = b.get('template', row['template'])

    try:
        existing = json.loads(row['data'])
    except Exception:
        existing = {}

    if 'data' in b and isinstance(b['data'], dict):
        existing.update(b['data'])

    db.execute(
        'UPDATE resumes SET title=?,template=?,data=?,updated_at=datetime("now") WHERE id=?',
        (title, template, json.dumps(existing, ensure_ascii=False), rid),
    )
    db.commit()
    return ok(parse_row(db.execute('SELECT * FROM resumes WHERE id=?', (rid,)).fetchone()))


@app.route('/resumes/<int:rid>', methods=['DELETE'])
@require_auth
def delete_resume(rid):
    db = get_db()
    row = db.execute('SELECT id FROM resumes WHERE id=? AND user_id=?', (rid, g.user_id)).fetchone()
    if not row:
        return err('Не знайдено', 404)
    db.execute('DELETE FROM resumes WHERE id=?', (rid,))
    db.commit()
    return ok({'deleted': rid})


# NLP helpers

def tokenize(text):
    tokens = re.findall(r'[a-zа-яіїєґ][a-zа-яіїєґ0-9+#\.\-]*', text.lower())
    result = []
    for t in tokens:
        t = t.strip('.-_')
        if len(t) < 2:
            continue
        t = SYNONYMS.get(t, t)
        if t in STOPWORDS_ALL:
            continue
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

    for l in data.get('languages', []):
        parts.append(l.get('language', ''))
    for pr in data.get('projects', []):
        parts += [pr.get('name', ''), pr.get('description', '')]

    lks = data.get('links', {})
    parts += list(lks.values())
    return ' '.join(str(x) for x in parts if x)


def get_verdict(score):
    if score >= 80:
        return 'Ідеальний збіг'
    if score >= 65:
        return 'Гарна відповідність'
    if score >= 50:
        return 'Середня відповідність'
    if score >= 35:
        return 'Низька відповідність'
    return 'Потребує доопрацювання'


def _is_valid_keyword(kw):
    return bool(
        kw
        and len(kw) > 2
        and not kw.isdigit()
        and not re.match(r'^\d+[+-]?\d*$', kw)
    )


def build_keyword_candidates(job_text, limit=15):
    candidates = []

    for item in extract_keywords(job_text, top_n=limit * 2):
        word = (item.get('word') or '').strip()
        if _is_valid_keyword(word) and word not in candidates:
            candidates.append(word)

    for word, _count in Counter(tokenize(job_text)).most_common(limit * 2):
        if _is_valid_keyword(word) and word not in candidates:
            candidates.append(word)

    return candidates[:limit]


def keyword_in_resume(keyword, resume_tokens, normalized_resume_text):
    normalized_keyword = ' '.join(tokenize(keyword))
    if not normalized_keyword:
        return False
    if ' ' in normalized_keyword:
        return normalized_keyword in normalized_resume_text
    return normalized_keyword in resume_tokens


def safe_cosine_percent(v1, v2):
    denom = np.linalg.norm(v1) * np.linalg.norm(v2)
    if denom == 0:
        return 0
    sim = np.dot(v1, v2) / denom
    return int(max(0, sim) * 100)


# Локальний аналіз
@app.route('/resumes/<int:rid>/analyze', methods=['POST'])
@require_auth
def analyze_resume(rid):
    db = get_db()
    row = db.execute(
        'SELECT data FROM resumes WHERE id=? AND user_id=?',
        (rid, g.user_id),
    ).fetchone()

    if not row:
        return err('Резюме не знайдено', 404)

    b = request.get_json(silent=True) or {}
    job_text = (b.get('jobText') or '').strip()

    if len(job_text) < 20:
        return err('Текст вакансії занадто короткий')

    try:
        resume_data = json.loads(row['data'])
    except Exception:
        resume_data = {}

    resume_text = resume_to_text(resume_data)

    if len(resume_text.strip()) < 20:
        return err('Резюме майже пусте. Заповніть дані.')

    model = get_semantic_model()

    if model:
        embeddings = model.encode([resume_text, job_text])
        score = safe_cosine_percent(embeddings[0], embeddings[1])
        method = 'semantic'
    else:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        norm_resume = ' '.join(tokenize(resume_text))
        norm_job = ' '.join(tokenize(job_text))

        vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=1000)
        try:
            tfidf = vectorizer.fit_transform([norm_resume, norm_job])
            sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
            score = int(sim * 100)
        except Exception:
            score = 0
        method = 'tfidf'

    top_keywords = build_keyword_candidates(job_text, limit=15)
    resume_tokens = set(tokenize(resume_text))
    normalized_resume_text = ' '.join(resume_tokens)

    found, missing = [], []
    for kw in top_keywords:
        target = found if keyword_in_resume(kw, resume_tokens, normalized_resume_text) else missing
        target.append({'word': kw})

    found_categorized = {
        'tech': [f for f in found if f['word'] in TECH_SKILLS],
        'soft': [f for f in found if f['word'] in SOFT_SKILLS],
        'business': [f for f in found if f['word'] in BUSINESS_SKILLS],
    }

    missing_categorized = {
        'tech': [m for m in missing if m['word'] in TECH_SKILLS],
        'soft': [m for m in missing if m['word'] in SOFT_SKILLS],
        'business': [m for m in missing if m['word'] in BUSINESS_SKILLS],
    }

    recs = []

    for m in missing_categorized['tech'][:3]:
        recs.append({
            'level': 'red',
            'word': m['word'],
            'text': f'Додайте "{m["word"]}" у розділ навичок — це ключова вимога',
        })

    for m in missing_categorized['soft'][:2]:
        recs.append({
            'level': 'yellow',
            'word': m['word'],
            'text': f'Згадайте "{m["word"]}" в описі досвіду або "Про себе"',
        })

    for m in missing_categorized['business'][:1]:
        recs.append({
            'level': 'yellow',
            'word': m['word'],
            'text': f'Додайте "{m["word"]}" — це важливо для цієї позиції',
        })

    if found_categorized['tech']:
        skills_list = ', '.join(f['word'] for f in found_categorized['tech'][:4])
        recs.append({
            'level': 'green',
            'word': '',
            'text': f'Ваші технічні навички ({skills_list}) відповідають вакансії',
        })

    if score >= 80:
        recs.append({'level': 'green', 'word': '', 'text': 'Ваше резюме має дуже високу відповідність вакансії.'})
    elif score >= 65:
        recs.append({'level': 'green', 'word': '', 'text': 'Хороша відповідність — резюме можна використовувати для відгуку.'})
    elif score >= 50:
        recs.append({'level': 'yellow', 'word': '', 'text': 'Додайте більше ключових навичок і конкретики з вимог вакансії.'})
    elif score >= 35:
        recs.append({'level': 'yellow', 'word': '', 'text': 'Адаптуйте резюме під вимоги вакансії.'})
    else:
        recs.append({'level': 'red', 'word': '', 'text': 'Резюме потребує значного доопрацювання під цю вакансію.'})

    unique_recs = []
    seen_texts = set()
    for rec in recs:
        if rec['text'] not in seen_texts:
            unique_recs.append(rec)
            seen_texts.add(rec['text'])

    return ok({
        'score': score,
        'verdict': get_verdict(score),
        'found': found[:8],
        'missing': missing[:8],
        'found_tech': found_categorized['tech'],
        'found_soft': found_categorized['soft'],
        'found_business': found_categorized['business'],
        'missing_tech': missing_categorized['tech'],
        'missing_soft': missing_categorized['soft'],
        'recommendations': unique_recs,
        'method': method,
        'modelStatus': {
            'loading': _model_loading,
            'ready': _model_loaded,
            'warning': 'ШІ-модель завантажується вперше. Наступний аналіз буде швидшим.' if _model_loading else None,
        },
    })


# Аналіз ШІ

def call_gemini_api(prompt):
    import requests

    for model in GEMINI_MODELS:
        url = f'{GEMINI_BASE_URL}/{model}:generateContent?key={GEMINI_KEY}'

        try:
            print(f"Спроба моделі: {model}...")
            response = requests.post(
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

            if response.status_code == 429:
                print(f"{model}: ліміт вичерпано")
                continue

            if response.status_code == 404:
                print(f"{model}: модель недоступна")
                continue

            if response.ok:
                print(f"Використано модель: {model}")
                return response.json(), model

        except Exception as e:
            print(f"{model}: {e}")
            continue

    return None, None


def parse_gemini_response(data):
    text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')

    if not text:
        raise ValueError('Gemini повернув порожню відповідь')

    json_str = text
    md_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', text)
    if md_match:
        json_str = md_match.group(1)

    json_match = re.search(r'\{[\s\S]*\}', json_str)
    if not json_match:
        raise ValueError('Gemini повернув некоректну відповідь')

    result = json.loads(json_match.group(0))

    result['score'] = max(0, min(100, round(result.get('score', 0))))
    result['verdict'] = result.get('verdict', 'OK')
    result['found'] = (result.get('found') or [])[:10]
    result['missing'] = (result.get('missing') or [])[:8]
    result['recommendations'] = result.get('recommendations') or []

    return result


@app.route('/resumes/<int:rid>/analyze/gemini', methods=['POST'])
@require_auth
def analyze_resume_gemini(rid):
    if not GEMINI_KEY:
        return err('Gemini API ключ не налаштовано на сервері', 503)

    db = get_db()
    row = db.execute(
        'SELECT data FROM resumes WHERE id=? AND user_id=?',
        (rid, g.user_id),
    ).fetchone()

    if not row:
        return err('Резюме не знайдено', 404)

    b = request.get_json(silent=True) or {}
    job_text = (b.get('jobText') or '').strip()

    if len(job_text) < 20:
        return err('Текст вакансії занадто короткий')

    try:
        resume_data = json.loads(row['data'])
    except Exception:
        resume_data = {}

    resume_text = resume_to_text(resume_data)

    if len(resume_text.strip()) < 20:
        return err('Резюме майже пусте. Заповніть дані.')

    prompt = f"""Ти — експерт з HR та ATS-систем. Проаналізуй відповідність резюме до вакансії.
        РЕЗЮМЕ:
        {resume_text}

        ВАКАНСІЯ:
        {job_text}

        Дай відповідь ТІЛЬКИ у форматі JSON (без markdown, без ```json, без пояснень поза JSON):
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
        - score: враховуй технічні навички (50%), досвід (30%), освіту (10%), м'які навички (10%)
        - found: до 10 найважливіших слів/навичок, що РЕАЛЬНО є в резюме
        - missing: до 8 важливих вимог вакансії, яких НЕМАЄ в резюме
        - recommendations: 3-6 конкретних порад (red=критично, yellow=бажано, green=добре)
        - НЕ вигадуй навички, яких немає в резюме
        - Відповідай ТІЛЬКИ валідним JSON, без коментарів"""

    data, used_model = call_gemini_api(prompt)

    if not data:
        return err('Усі моделі Gemini недоступні. Спробуйте локальний аналіз.', 503)

    try:
        result = parse_gemini_response(data)
    except ValueError as e:
        return err(str(e), 502)
    except json.JSONDecodeError:
        return err('Gemini повернув невалідний JSON', 502)

    result['method'] = f'gemini-{used_model}' if used_model else 'gemini'

    return ok(result)


if __name__ == '__main__':
    print('=' * 52)
    print('  Сервер: http://localhost:5000')
    print(f"  Gemini: {'активовано' if GEMINI_KEY else 'не налаштовано'}")
    print('=' * 52)
    app.run(host='0.0.0.0', port=5000, debug=False)
