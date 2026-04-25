FROM python:3.11-slim

WORKDIR /app

# Зависимости системы
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python-зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Исходники
COPY . .

# Создаём директории для загрузок
RUN mkdir -p /uploads/professions/images /uploads/professions/videos \
             /uploads/assignments /uploads/submissions

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
