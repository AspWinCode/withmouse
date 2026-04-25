from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.db.database import get_db
from app.core.deps import get_strict_admin, get_current_admin
from app.models.user import User, UserRole
from app.models.profession import Profession
from app.models.test import Test, TestAttempt
from app.models.assignment import Assignment
from app.models.submission import Submission, SubmissionStatus
from app.schemas.user import UserOut, UserAdminUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    total_students = db.query(User).filter(User.role == UserRole.student).count()
    total_professions = db.query(Profession).count()
    total_tests = db.query(Test).count()
    total_assignments = db.query(Assignment).count()
    total_submissions = db.query(Submission).count()
    pending_submissions = db.query(Submission).filter(
        Submission.status.in_([SubmissionStatus.submitted, SubmissionStatus.reviewing])
    ).count()
    test_attempts_today = db.query(TestAttempt).filter(
        func.date(TestAttempt.started_at) == func.current_date()
    ).count()

    return {
        "total_students": total_students,
        "total_professions": total_professions,
        "total_tests": total_tests,
        "total_assignments": total_assignments,
        "total_submissions": total_submissions,
        "pending_submissions": pending_submissions,
        "test_attempts_today": test_attempts_today,
    }


@router.get("/students", response_model=List[UserOut])
def list_students(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    return db.query(User).filter(User.role == UserRole.student).order_by(User.created_at.desc()).all()


@router.get("/students/{student_id}", response_model=UserOut)
def get_student(student_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    u = db.query(User).filter(User.id == student_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return u


@router.get("/students/{student_id}/stats")
def get_student_stats(student_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    u = db.query(User).filter(User.id == student_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    attempts = db.query(TestAttempt).filter(
        TestAttempt.student_id == student_id,
        TestAttempt.is_completed == True,
    ).all()

    submissions = db.query(Submission).filter(Submission.student_id == student_id).all()

    return {
        "student": UserOut.model_validate(u),
        "test_attempts": len(attempts),
        "avg_test_score": (
            sum(a.score / a.max_score * 100 for a in attempts if a.max_score > 0) / len(attempts)
            if attempts else 0
        ),
        "total_submissions": len(submissions),
        "accepted_submissions": sum(1 for s in submissions if s.status == SubmissionStatus.accepted),
    }


@router.patch("/students/{student_id}", response_model=UserOut)
def update_student(
    student_id: int,
    data: UserAdminUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    u = db.query(User).filter(User.id == student_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(u, k, v)
    db.commit()
    db.refresh(u)
    return u


@router.get("/users", response_model=List[UserOut])
def list_all_users(db: Session = Depends(get_db), _: User = Depends(get_strict_admin)):
    return db.query(User).order_by(User.created_at.desc()).all()
