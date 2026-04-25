from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.db.database import get_db
from app.core.deps import get_current_user, get_strict_admin
from app.models.user import User
from app.models.test import Test, Question, QuestionOption, TestAttempt, TestAnswer, QuestionType
from app.schemas.test import (
    TestCreate, TestUpdate, TestOut, TestAdminOut, TestListOut,
    QuestionCreate, QuestionUpdate,
    TestSubmit, TestAttemptOut, TestAttemptListOut,
)

router = APIRouter(prefix="/tests", tags=["tests"])


# ─── Статические пути ОБЯЗАТЕЛЬНО перед /{test_id} ────────────────────────

@router.get("/attempts/my", response_model=List[TestAttemptListOut])
def my_attempts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Все попытки текущего пользователя по всем тестам."""
    attempts = (
        db.query(TestAttempt)
        .filter(TestAttempt.student_id == current_user.id, TestAttempt.is_completed == True)
        .order_by(TestAttempt.completed_at.desc())
        .all()
    )
    return [
        TestAttemptListOut(
            id=a.id,
            test_id=a.test_id,
            test_title=a.test.title,
            score=a.score,
            max_score=a.max_score,
            is_completed=a.is_completed,
            started_at=a.started_at,
        )
        for a in attempts
    ]


# ─── CRUD тестов ────────────────────────────────────────────────────────────

@router.get("", response_model=List[TestListOut])
def list_tests(
    profession_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Test)
    if current_user.role == "student":
        q = q.filter(Test.is_published == True)
    if profession_id:
        q = q.filter(Test.profession_id == profession_id)
    tests = q.all()
    return [
        TestListOut(
            id=t.id,
            title=t.title,
            description=t.description,
            max_attempts=t.max_attempts,
            profession_id=t.profession_id,
            question_count=len(t.questions),
        )
        for t in tests
    ]


@router.post("", response_model=TestAdminOut, status_code=201)
def create_test(
    data: TestCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    test = Test(
        title=data.title,
        description=data.description,
        max_attempts=data.max_attempts,
        is_published=data.is_published,
        profession_id=data.profession_id,
    )
    db.add(test)
    db.flush()
    for q_data in data.questions:
        _add_question(db, test.id, q_data)
    db.commit()
    db.refresh(test)
    return test


@router.get("/{test_id}", response_model=TestOut)
def get_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Test).filter(Test.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Тест не найден")
    return t


@router.get("/{test_id}/admin", response_model=TestAdminOut)
def get_test_admin(
    test_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    t = db.query(Test).filter(Test.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Тест не найден")
    return t


@router.patch("/{test_id}", response_model=TestAdminOut)
def update_test(
    test_id: int,
    data: TestUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    t = db.query(Test).filter(Test.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Тест не найден")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{test_id}", status_code=204)
def delete_test(
    test_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    t = db.query(Test).filter(Test.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Тест не найден")
    db.delete(t)
    db.commit()


# ─── Вопросы ────────────────────────────────────────────────────────────────

@router.post("/{test_id}/questions", response_model=TestAdminOut, status_code=201)
def add_question(
    test_id: int,
    data: QuestionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    t = db.query(Test).filter(Test.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Тест не найден")
    _add_question(db, test_id, data)
    db.commit()
    db.refresh(t)
    return t


@router.patch("/{test_id}/questions/{question_id}", response_model=TestAdminOut)
def update_question(
    test_id: int,
    question_id: int,
    data: QuestionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    q = db.query(Question).filter(
        Question.id == question_id, Question.test_id == test_id
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    for k, v in data.model_dump(exclude_none=True, exclude={"options"}).items():
        setattr(q, k, v)
    if data.options is not None:
        for opt in q.options:
            db.delete(opt)
        db.flush()
        for opt_data in data.options:
            db.add(QuestionOption(**opt_data.model_dump(), question_id=question_id))
    db.commit()
    t = db.query(Test).filter(Test.id == test_id).first()
    db.refresh(t)
    return t


@router.delete("/{test_id}/questions/{question_id}", status_code=204)
def delete_question(
    test_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    q = db.query(Question).filter(
        Question.id == question_id, Question.test_id == test_id
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    db.delete(q)
    db.commit()


# ─── Попытки ─────────────────────────────────────────────────────────────────

@router.post("/{test_id}/attempt", response_model=TestAttemptOut)
def submit_test(
    test_id: int,
    data: TestSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Test).filter(Test.id == test_id).first()
    if not t or not t.is_published:
        raise HTTPException(status_code=404, detail="Тест не найден")

    completed_count = db.query(TestAttempt).filter(
        TestAttempt.test_id == test_id,
        TestAttempt.student_id == current_user.id,
        TestAttempt.is_completed == True,
    ).count()
    if completed_count >= t.max_attempts:
        raise HTTPException(
            status_code=400,
            detail=f"Превышен лимит попыток ({t.max_attempts})",
        )

    attempt = TestAttempt(test_id=test_id, student_id=current_user.id)
    db.add(attempt)
    db.flush()

    total_score = 0.0
    max_score = 0.0

    for answer_data in data.answers:
        q = db.query(Question).filter(
            Question.id == answer_data.question_id,
            Question.test_id == test_id,
        ).first()
        if not q:
            continue

        max_score += q.points
        is_correct = None
        points_earned = 0.0

        if q.type in (QuestionType.single, QuestionType.multiple):
            correct_ids = {opt.id for opt in q.options if opt.is_correct}
            selected = set(answer_data.selected_options)
            is_correct = selected == correct_ids
            points_earned = float(q.points) if is_correct else 0.0

        total_score += points_earned
        db.add(TestAnswer(
            attempt_id=attempt.id,
            question_id=q.id,
            selected_options=answer_data.selected_options,
            open_answer=answer_data.open_answer,
            is_correct=is_correct,
            points_earned=points_earned,
        ))

    attempt.score = total_score
    attempt.max_score = max_score
    attempt.is_completed = True
    attempt.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(attempt)
    return attempt


@router.get("/{test_id}/attempts/my", response_model=List[TestAttemptOut])
def my_test_attempts(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Попытки текущего пользователя по конкретному тесту."""
    return (
        db.query(TestAttempt)
        .filter(
            TestAttempt.test_id == test_id,
            TestAttempt.student_id == current_user.id,
            TestAttempt.is_completed == True,
        )
        .order_by(TestAttempt.completed_at.desc())
        .all()
    )


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _add_question(db: Session, test_id: int, data: QuestionCreate) -> Question:
    q = Question(
        test_id=test_id,
        type=data.type,
        text=data.text,
        points=data.points,
        order=data.order,
    )
    db.add(q)
    db.flush()
    for i, opt_data in enumerate(data.options):
        db.add(QuestionOption(**opt_data.model_dump(), question_id=q.id))
    return q
