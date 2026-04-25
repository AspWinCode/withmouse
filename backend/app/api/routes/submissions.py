from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import os
from app.db.database import get_db
from app.core.deps import get_current_user, get_current_admin
from app.core.files import save_upload_file
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.assignment import Assignment
from app.models.submission import Submission, SubmissionStatus
from app.schemas.submission import SubmissionCreate, SubmissionReview, SubmissionOut, SubmissionAdminOut

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post("", response_model=SubmissionOut, status_code=201)
async def submit_assignment(
    assignment_id: int = Form(...),
    text_answer: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.is_published == True).first()
    if not a:
        raise HTTPException(status_code=404, detail="Задание не найдено")

    if not text_answer and not file:
        raise HTTPException(status_code=400, detail="Необходимо предоставить ответ (текст или файл)")

    file_path = None
    original_name = None
    if file:
        file_path, original_name = await save_upload_file(file, "submissions", "any")

    sub = Submission(
        student_id=current_user.id,
        assignment_id=assignment_id,
        text_answer=text_answer,
        file_path=file_path,
        original_file_name=original_name,
        status=SubmissionStatus.submitted,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/my", response_model=List[SubmissionOut])
def my_submissions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Submission).filter(
        Submission.student_id == current_user.id
    ).order_by(Submission.submitted_at.desc()).all()


@router.get("/my/{submission_id}", response_model=SubmissionOut)
def my_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.student_id == current_user.id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Работа не найдена")
    return s


@router.get("/my/{submission_id}/download")
def download_my_submission_file(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.student_id == current_user.id,
    ).first()
    if not s or not s.file_path:
        raise HTTPException(status_code=404, detail="Файл не найден")
    full_path = os.path.join(settings.UPLOAD_DIR, s.file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Файл отсутствует на сервере")
    return FileResponse(path=full_path, filename=s.original_file_name or os.path.basename(s.file_path))


# Admin routes

@router.get("", response_model=List[SubmissionAdminOut])
def list_submissions(
    status: Optional[SubmissionStatus] = None,
    assignment_id: Optional[int] = None,
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    q = db.query(Submission)
    if status:
        q = q.filter(Submission.status == status)
    if assignment_id:
        q = q.filter(Submission.assignment_id == assignment_id)
    if student_id:
        q = q.filter(Submission.student_id == student_id)
    submissions = q.order_by(Submission.submitted_at.desc()).all()

    result = []
    for s in submissions:
        out = SubmissionAdminOut.model_validate(s)
        out.student_name = s.student.name
        out.student_phone = s.student.phone
        out.assignment_title = s.assignment.title
        out.assignment_max_score = s.assignment.max_score
        result.append(out)
    return result


@router.get("/{submission_id}", response_model=SubmissionAdminOut)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Работа не найдена")
    out = SubmissionAdminOut.model_validate(s)
    out.student_name = s.student.name
    out.student_phone = s.student.phone
    out.assignment_title = s.assignment.title
    out.assignment_max_score = s.assignment.max_score
    return out


@router.patch("/{submission_id}/review", response_model=SubmissionAdminOut)
def review_submission(
    submission_id: int,
    data: SubmissionReview,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Работа не найдена")

    if data.score is not None:
        max_score = s.assignment.max_score
        if data.score > max_score:
            raise HTTPException(status_code=400, detail=f"Балл не может превышать максимум ({max_score})")
        s.score = data.score

    s.status = data.status
    if data.comment is not None:
        s.comment = data.comment
    s.reviewer_id = admin.id
    s.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(s)

    out = SubmissionAdminOut.model_validate(s)
    out.student_name = s.student.name
    out.student_phone = s.student.phone
    out.assignment_title = s.assignment.title
    out.assignment_max_score = s.assignment.max_score
    return out


@router.patch("/{submission_id}/status", response_model=SubmissionAdminOut)
def update_submission_status(
    submission_id: int,
    status: SubmissionStatus,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Работа не найдена")
    s.status = status
    s.reviewer_id = admin.id
    db.commit()
    db.refresh(s)
    out = SubmissionAdminOut.model_validate(s)
    out.student_name = s.student.name
    out.student_phone = s.student.phone
    out.assignment_title = s.assignment.title
    out.assignment_max_score = s.assignment.max_score
    return out


@router.get("/{submission_id}/download")
def download_submission_file(
    submission_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s or not s.file_path:
        raise HTTPException(status_code=404, detail="Файл не найден")
    full_path = os.path.join(settings.UPLOAD_DIR, s.file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Файл отсутствует на сервере")
    return FileResponse(path=full_path, filename=s.original_file_name or os.path.basename(s.file_path))
