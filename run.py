"""
Запуск вебсервісу «Автоматизоване Резюме»

Використання:
    python run.py

Для ngrok:
    ngrok http 5000
"""

import sys
import os

BASE = os.path.dirname(os.path.abspath(__file__))

if sys.version_info < (3, 9):
    print("X Потрібен Python 3.9 або новіший.")
    sys.exit(1)

# Перевірка бекенду
backend_app = os.path.join(BASE, 'backend', 'app.py')
if not os.path.exists(backend_app):
    print(f"X Файл не знайдено: backend/app.py")
    sys.exit(1)

# Перевірка фронтенду
react_build  = os.path.join(BASE, 'frontend', 'dist', 'index.html')
old_frontend = os.path.join(BASE, 'frontend', 'index.html')

if os.path.exists(react_build):
    frontend_mode = 'react-build'
    frontend_path = os.path.join(BASE, 'frontend', 'dist')
elif os.path.exists(old_frontend):
    frontend_mode = 'static'
    frontend_path = os.path.join(BASE, 'frontend')
else:
    print("X Фронтенд не знайдено.")
    sys.exit(1)

# Запуск бекенду
backend_dir = os.path.join(BASE, 'backend')
os.chdir(backend_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

print("=" * 52)
print("  Вебсервіс «Автоматизоване Резюме»")
print("=" * 52)
print(f"  Сайт:      http://localhost:5000")
print(f"  Фронтенд:  {frontend_mode}  ({frontend_path})")
print(f"  Для ngrok: ngrok http 5000")
print("  Зупинити:  Ctrl+C")
print("=" * 52)

from app import app
app.run(host='0.0.0.0', port=5000, debug=False)