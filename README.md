# 🐭 С мышкой по жизни

Профориентационный образовательный портал для школьников.

## 🏗 Технологический стек

| Слой | Технология |
|------|-----------|
| Backend | FastAPI 0.111 + SQLAlchemy 2 + Alembic |
| База данных | PostgreSQL 16 |
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS |
| Авторизация | JWT (access + refresh токены) |
| Файлы | Локальное хранилище (легко мигрировать на S3) |
| Deploy | Docker Compose + Nginx |

---

## 🚀 Быстрый старт (Docker)

```bash
# 1. Клонируй репозиторий
git clone <repo-url>
cd mouse

# 2. Запусти все сервисы
docker compose up -d --build

# 3. Создай первого администратора и тестовые данные
docker compose exec backend python seed.py

# 4. Открой в браузере
open http://localhost          # Сайт (через Nginx)
open http://localhost:3000     # Напрямую Next.js
open http://localhost:8000/api/docs  # Swagger UI
```

### Учётные данные по умолчанию (после seed)

| Роль | Телефон | Пароль |
|------|---------|--------|
| Администратор | +79990000000 | admin123 |
| Ученик | +79991111111 | student123 |

---

## 💻 Локальная разработка

### Требования
- Python 3.11+
- Node.js 20+
- PostgreSQL 16

### Backend

```bash
cd backend

# Создай виртуальное окружение
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Установи зависимости
pip install -r requirements.txt

# Скопируй .env
cp .env.example .env
# Отредактируй .env — укажи DATABASE_URL

# Применить миграции (или создать таблицы через seed)
alembic upgrade head

# Заполнить начальные данные
python seed.py

# Запустить сервер
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Установи зависимости
npm install

# Скопируй .env
cp .env.local.example .env.local  # или используй существующий .env.local

# Запустить в dev-режиме
npm run dev
```

Открой: http://localhost:3000

---

## 📁 Структура проекта

```
mouse/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # auth, professions, tests, assignments, submissions, admin
│   │   ├── core/            # config, security, deps, files
│   │   ├── db/              # database.py (SQLAlchemy engine)
│   │   ├── models/          # User, Profession, Test, Assignment, Submission
│   │   ├── schemas/         # Pydantic schemas
│   │   └── main.py          # FastAPI app
│   ├── alembic/             # Миграции БД
│   ├── seed.py              # Начальные данные
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   │   ├── (public)     # Главная, профессии
│   │   │   ├── auth/        # Вход / Регистрация
│   │   │   ├── cabinet/     # Личный кабинет ученика
│   │   │   └── admin/       # Панель администратора
│   │   ├── components/      # UI, layout, формы
│   │   ├── hooks/           # useAuth
│   │   ├── lib/             # api.ts, auth.ts, utils.ts
│   │   └── types/           # TypeScript типы
│   └── Dockerfile
├── nginx/
│   └── nginx.conf
├── uploads/                 # Загружаемые файлы (в .gitignore)
├── docker-compose.yml
└── README.md
```

---

## 🌐 Страницы приложения

### Публичная часть
| URL | Описание |
|-----|----------|
| `/` | Главная страница |
| `/professions` | Каталог профессий |
| `/professions/:id` | Карточка профессии |
| `/auth/login` | Вход |
| `/auth/register` | Регистрация |

### Личный кабинет ученика (`/cabinet/*`)
| URL | Описание |
|-----|----------|
| `/cabinet` | Дашборд |
| `/cabinet/professions` | Список профессий |
| `/cabinet/tests` | Список тестов |
| `/cabinet/tests/:id` | Прохождение теста |
| `/cabinet/assignments` | Список заданий |
| `/cabinet/assignments/:id` | Выполнение задания |
| `/cabinet/results` | Мои результаты |
| `/cabinet/profile` | Профиль |

### Административная панель (`/admin/*`)
| URL | Описание |
|-----|----------|
| `/admin` | Дашборд со статистикой |
| `/admin/professions` | CRUD профессий |
| `/admin/tests` | CRUD тестов и вопросов |
| `/admin/assignments` | CRUD заданий |
| `/admin/submissions` | Ответы учеников + проверка |
| `/admin/students` | Список учеников |

---

## 🔌 API

Swagger UI: http://localhost:8000/api/docs

### Основные эндпоинты

```
POST   /api/auth/register        — Регистрация
POST   /api/auth/login           — Вход
POST   /api/auth/refresh         — Обновление токена
GET    /api/auth/me              — Текущий пользователь

GET    /api/professions          — Список профессий
GET    /api/professions/:id      — Карточка профессии
POST   /api/professions          — [admin] Создать
PATCH  /api/professions/:id      — [admin] Обновить

GET    /api/tests                — Список тестов
GET    /api/tests/:id            — Получить тест
POST   /api/tests/:id/attempt    — Пройти тест

GET    /api/assignments          — Список заданий
POST   /api/submissions          — Отправить ответ
GET    /api/submissions/my       — Мои работы
PATCH  /api/submissions/:id/review — [admin] Проверить

GET    /api/admin/dashboard      — Статистика
GET    /api/admin/students       — Список учеников
```

---

## 🔐 Роли пользователей

| Роль | Описание |
|------|----------|
| `student` | Ученик — проходит тесты, выполняет задания |
| `admin` | Администратор — полный доступ |
| `reviewer` | Проверяющий — только проверка заданий |

---

## 📊 Статусы заданий

```
submitted  →  reviewing  →  accepted
                         ↘  revision  →  (повторная отправка)
                         ↘  rejected
```

---

## 🛠 Миграции БД

```bash
cd backend

# Создать новую миграцию
alembic revision --autogenerate -m "описание изменений"

# Применить миграции
alembic upgrade head

# Откатить на 1 шаг
alembic downgrade -1
```

---

## 📦 Переменные окружения

### Backend (`.env`)
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SECRET_KEY=минимум-32-символа-случайная-строка
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
UPLOAD_DIR=../uploads
MAX_FILE_SIZE_MB=50
CORS_ORIGINS=["http://localhost:3000"]
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_UPLOAD_URL=http://localhost:8000
```
