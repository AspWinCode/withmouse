"""
Скрипт первоначального заполнения БД.
Создаёт администратора и тестовые данные.

Запуск:
    python seed.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.profession import Profession
from app.models.test import Test, Question, QuestionOption, QuestionType
from app.models.assignment import Assignment, AssignmentType
from app.core.security import get_password_hash

# Создаём таблицы
Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    try:
        # ── Администратор ──────────────────────────────────────────────
        admin_phone = "+79990000000"
        if not db.query(User).filter(User.phone == admin_phone).first():
            admin = User(
                name="Администратор",
                phone=admin_phone,
                hashed_password=get_password_hash("admin123"),
                role=UserRole.admin,
            )
            db.add(admin)
            print(f"✅ Администратор создан: {admin_phone} / admin123")
        else:
            print("ℹ️  Администратор уже существует")

        # ── Тестовый ученик ────────────────────────────────────────────
        student_phone = "+79991111111"
        if not db.query(User).filter(User.phone == student_phone).first():
            student = User(
                name="Иван Петров",
                phone=student_phone,
                hashed_password=get_password_hash("student123"),
                role=UserRole.student,
            )
            db.add(student)
            print(f"✅ Ученик создан: {student_phone} / student123")

        # ── Профессии ──────────────────────────────────────────────────
        professions_data = [
            {
                "title": "Программист",
                "short_description": "Разрабатывает программное обеспечение и веб-сайты",
                "description": (
                    "Программист — специалист, который пишет код для создания "
                    "приложений, сайтов, игр и других программ. "
                    "Это одна из самых востребованных профессий в мире IT."
                ),
                "what_does": (
                    "• Пишет программный код на различных языках\n"
                    "• Тестирует и отлаживает программы\n"
                    "• Разрабатывает алгоритмы решения задач\n"
                    "• Работает в команде над большими проектами"
                ),
                "skills": (
                    "• Логическое мышление\n"
                    "• Знание языков программирования (Python, JavaScript, Java)\n"
                    "• Понимание алгоритмов и структур данных\n"
                    "• Умение работать с базами данных"
                ),
                "where_works": (
                    "• IT-компании\n• Стартапы\n• Банки и финтех\n"
                    "• Государственные структуры\n• Фриланс"
                ),
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            },
            {
                "title": "Дизайнер",
                "short_description": "Создаёт визуальный образ брендов, продуктов и интерфейсов",
                "description": (
                    "Дизайнер отвечает за внешний вид и удобство использования "
                    "цифровых и физических продуктов. UX/UI-дизайнеры работают "
                    "над интерфейсами приложений, графические дизайнеры — "
                    "над визуальной идентификацией брендов."
                ),
                "what_does": (
                    "• Проектирует пользовательские интерфейсы\n"
                    "• Создаёт брендбуки и фирменный стиль\n"
                    "• Рисует иллюстрации и инфографику\n"
                    "• Проводит исследования пользователей"
                ),
                "skills": (
                    "• Владение Figma, Adobe Photoshop, Illustrator\n"
                    "• Чувство стиля и цвета\n"
                    "• Понимание UX-принципов\n"
                    "• Творческое мышление"
                ),
                "where_works": (
                    "• Дизайн-студии\n• IT-компании\n• Рекламные агентства\n"
                    "• Издательства\n• Фриланс"
                ),
            },
            {
                "title": "Врач",
                "short_description": "Диагностирует и лечит болезни, помогает людям сохранить здоровье",
                "description": (
                    "Врач — одна из древнейших и наиболее уважаемых профессий. "
                    "Специальностей очень много: терапевт, хирург, педиатр, "
                    "психиатр и многие другие."
                ),
                "what_does": (
                    "• Осматривает пациентов и ставит диагнозы\n"
                    "• Назначает лечение и медикаменты\n"
                    "• Проводит хирургические операции\n"
                    "• Ведёт медицинскую документацию"
                ),
                "skills": (
                    "• Глубокие знания анатомии и медицины\n"
                    "• Стрессоустойчивость\n"
                    "• Эмпатия и коммуникабельность\n"
                    "• Внимательность к деталям"
                ),
                "where_works": (
                    "• Больницы и поликлиники\n"
                    "• Частные клиники\n"
                    "• Скорая помощь\n"
                    "• Научно-исследовательские институты"
                ),
            },
        ]

        profs = []
        for pd in professions_data:
            existing = db.query(Profession).filter(Profession.title == pd["title"]).first()
            if not existing:
                p = Profession(**pd)
                db.add(p)
                db.flush()
                profs.append(p)
                print(f"✅ Профессия: {pd['title']}")
            else:
                profs.append(existing)

        db.flush()

        # ── Тест ───────────────────────────────────────────────────────
        if profs and not db.query(Test).first():
            test = Test(
                title="Основы программирования",
                description="Проверьте свои знания о профессии программиста",
                profession_id=profs[0].id,
                max_attempts=3,
            )
            db.add(test)
            db.flush()

            questions = [
                {
                    "type": QuestionType.single,
                    "text": "Что такое алгоритм?",
                    "points": 1,
                    "options": [
                        ("Последовательность шагов для решения задачи", True),
                        ("Язык программирования", False),
                        ("База данных", False),
                        ("Тип переменной", False),
                    ],
                },
                {
                    "type": QuestionType.multiple,
                    "text": "Какие из перечисленных являются языками программирования?",
                    "points": 2,
                    "options": [
                        ("Python", True),
                        ("HTML", False),
                        ("JavaScript", True),
                        ("Word", False),
                        ("Java", True),
                    ],
                },
                {
                    "type": QuestionType.open,
                    "text": "Что такое переменная в программировании?",
                    "points": 2,
                    "options": [],
                },
            ]

            for i, qd in enumerate(questions):
                q = Question(
                    test_id=test.id,
                    type=qd["type"],
                    text=qd["text"],
                    points=qd["points"],
                    order=i,
                )
                db.add(q)
                db.flush()
                for j, (text, is_correct) in enumerate(qd["options"]):
                    db.add(QuestionOption(
                        question_id=q.id, text=text, is_correct=is_correct, order=j
                    ))

            print(f"✅ Тест создан: {test.title}")

        # ── Задания ────────────────────────────────────────────────────
        if profs and not db.query(Assignment).first():
            assignments_data = [
                {
                    "title": "Напиши о своей мечте",
                    "description": (
                        "Напиши небольшое эссе (150–200 слов) о том, "
                        "кем ты хочешь стать и почему. "
                        "Расскажи, какие качества тебе пригодятся в этой профессии."
                    ),
                    "type": AssignmentType.text,
                    "max_score": 10,
                    "profession_id": profs[0].id,
                },
                {
                    "title": "Аналитика рынка труда",
                    "description": (
                        "Скачай таблицу с данными о вакансиях. "
                        "Проанализируй, какие навыки встречаются чаще всего. "
                        "Загрузи итоговый файл с твоими выводами."
                    ),
                    "type": AssignmentType.analytical,
                    "max_score": 20,
                    "profession_id": profs[0].id,
                },
            ]
            for ad in assignments_data:
                a = Assignment(**ad)
                db.add(a)
                print(f"✅ Задание: {ad['title']}")

        db.commit()
        print("\n🎉 Seed выполнен успешно!")
        print("─" * 40)
        print("👤 Логин администратора: +79990000000")
        print("🔑 Пароль:              admin123")
        print("👤 Логин ученика:       +79991111111")
        print("🔑 Пароль:              student123")
        print("─" * 40)

    except Exception as e:
        db.rollback()
        print(f"❌ Ошибка: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
