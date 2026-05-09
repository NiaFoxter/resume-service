"""
Запуск вебсервісу «Автоматизоване Резюме»

Використання:
    python run.py

Перед першим запуском встановіть залежності:
    pip install -r requirements.txt
"""

import sys
import os

BASE     = os.path.dirname(os.path.abspath(__file__))
REQ_FILE = os.path.join(BASE, 'requirements.txt')

# 1. Перевірка версії Python
if sys.version_info < (3, 9):
    print("X Потрібен Python 3.9 або новіший.")
    print(f"  Поточна версія: {sys.version.split()[0]}")
    sys.exit(1)

# 2. Перевірка залежностей
REQUIRED = {
    'flask':      'Flask',
    'jwt':        'PyJWT',
    'werkzeug':   'Werkzeug',
}

missing = []
for import_name, pkg_name in REQUIRED.items():
    try:
        __import__(import_name)
    except ImportError:
        missing.append(pkg_name)

if missing:
    print("=" * 52)
    print("  X Не знайдено необхідних пакетів:")
    for pkg in missing:
        print(f"    - {pkg}")
    print()
    print("  Встановіть залежності командою:")
    print("    pip install -r requirements.txt")
    print()
    print("  Або встановіть кожен пакет окремо:")
    print(f"    pip install {' '.join(missing)}")
    print("=" * 52)
    sys.exit(1)

# 3. Перевірка файлів проєкту
for required_file, label in [
    (os.path.join(BASE, 'backend', 'app.py'),      'backend/app.py'),
    (os.path.join(BASE, 'frontend', 'index.html'), 'frontend/index.html'),
]:
    if not os.path.exists(required_file):
        print(f"X Файл не знайдено: {label}")
        sys.exit(1)

# 4. Запуск серверів
import threading
import time
import webbrowser

def run_backend():
    backend_dir = os.path.join(BASE, 'backend')
    os.chdir(backend_dir)
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    try:
        from app import app
        app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
    except OSError as e:
        if 'Address already in use' in str(e):
            print()
            print("X Порт 5000 вже зайнятий.")
            print("  Зупиніть інший процес або використайте інший порт")
        else:
            print(f"X Помилка бекенду: {e}")

def run_frontend():
    import http.server, socketserver
    os.chdir(os.path.join(BASE, 'frontend'))

    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, fmt, *args): pass

    try:
        with socketserver.TCPServer(('', 8080), QuietHandler) as httpd:
            httpd.serve_forever()
    except OSError as e:
        if 'Address already in use' in str(e):
            print("X Порт 8080 вже зайнятий.")
        else:
            print(f"X Помилка фронтенду: {e}")

print("=" * 52)
print("  Вебсервіс «Автоматизоване Резюме»")
print("=" * 52)
print(f"  Python:     {sys.version.split()[0]}")
print(f"  Бекенд:     http://localhost:5000")
print(f"  Фронтенд:   http://localhost:8080")
print("  Зупинити:   Ctrl+C")
print("=" * 52)

t_back  = threading.Thread(target=run_backend,  daemon=True, name='backend')
t_front = threading.Thread(target=run_frontend, daemon=True, name='frontend')

t_back.start()
t_front.start()

time.sleep(1.5)
try:
    webbrowser.open('http://localhost:8080')
except Exception:
    pass

try:
    while True:
        time.sleep(1)
        if not t_back.is_alive() and not t_front.is_alive():
            print("X Обидва сервери завершили роботу.")
            break
except KeyboardInterrupt:
    print("\n  Сервер зупинено.")