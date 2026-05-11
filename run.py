"""
Запуск вебсервісу «Автоматизоване Резюме»

Використання:
    python run.py
"""

import sys
import os

BASE = os.path.dirname(os.path.abspath(__file__))

if sys.version_info < (3, 9):
    print("X Потрібен Python 3.9 або новіший.")
    sys.exit(1)

# Перевірка файлів
for required_file, label in [
    (os.path.join(BASE, 'backend', 'app.py'), 'backend/app.py'),
    (os.path.join(BASE, 'frontend', 'index.html'), 'frontend/index.html'),
]:
    if not os.path.exists(required_file):
        print(f"X Файл не знайдено: {label}")
        sys.exit(1)

# Запуск тільки бекенду
backend_dir = os.path.join(BASE, 'backend')
os.chdir(backend_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

print("=" * 52)
print("  Вебсервіс «Автоматизоване Резюме»")
print("=" * 52)
print(f"  Сайт: http://localhost:5000")
print("  Зупинити: Ctrl+C")
print("=" * 52)

from app import app
app.run(host='0.0.0.0', port=5000, debug=False)