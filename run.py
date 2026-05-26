"""
Запуск вебсервісу «Автоматизоване Резюме».

Перед першим запуском зберіть фронтенд:
    cd frontend
    npm install
    npm run build

Після цього з кореня проєкту:
    python run.py

Для ngrok:
    ngrok http 5000
"""

import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE, 'backend')
BACKEND_APP = os.path.join(BACKEND_DIR, 'app.py')
REACT_BUILD = os.path.join(BASE, 'dist', 'index.html')

if sys.version_info < (3, 9):
    print('X Потрібен Python 3.9 або новіший.')
    sys.exit(1)

if not os.path.exists(BACKEND_APP):
    print('X Файл не знайдено: backend/app.py')
    sys.exit(1)

if not os.path.exists(REACT_BUILD):
    print('X Збірку фронтенду не знайдено.')
    print('  Виконайте: cd frontend && npm install && npm run build')
    sys.exit(1)

os.chdir(BACKEND_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

print('=' * 52)
print('  Вебсервіс «Автоматизоване Резюме»')
print('=' * 52)
print('  Сайт:      http://localhost:5000')
print(f'  Фронтенд:  react-build  ({os.path.dirname(REACT_BUILD)})')
print('  Health:    http://localhost:5000/api/health')
print('  Для ngrok: ngrok http 5000')
print('  Зупинити:  Ctrl+C')
print('=' * 52)

from app import app

app.run(host='0.0.0.0', port=int(os.environ.get('PORT', '5000')), debug=False)
