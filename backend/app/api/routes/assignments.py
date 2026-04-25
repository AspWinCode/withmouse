from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from app.db.database import get_db
from app.core.deps import get_current_user, get_strict_admin
from app.core.files import save_upload_file, delete_file
from app.core.config import settings
from app.models.user import User
from app.models.assignment import Assignment, AssignmentFile, AssignmentType
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate, AssignmentOut, AssignmentListOut

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("", response_model=List[AssignmentListOut])
def list_assignments(
    profession_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Assignment)
    if current_user.role == "student":
        q = q.filter(Assignment.is_published == True)
    if profession_id:
        q = q.filter(Assignment.profession_id == profession_id)
    return q.order_by(Assignment.id.desc()).all()


@router.get("/{assignment_id}", response_model=AssignmentOut)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Задание не найдено")
    return a


@router.post("", response_model=AssignmentOut, status_code=201)
def create_assignment(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    a = Assignment(**data.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.patch("/{assignment_id}", response_model=AssignmentOut)
def update_assignment(
    assignment_id: int,
    data: AssignmentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Задание не найдено")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{assignment_id}", status_code=204)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Задание не найдено")
    db.delete(a)
    db.commit()


@router.post("/{assignment_id}/files", response_model=AssignmentOut)
async def upload_assignment_file(
    assignment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Задание не найдено")

    file_path, original_name = await save_upload_file(file, "assignments", "document")
    af = AssignmentFile(assignment_id=assignment_id, file_path=file_path, original_name=original_name)
    db.add(af)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{assignment_id}/files/{file_id}", status_code=204)
def delete_assignment_file(
    assignment_id: int,
    file_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    af = db.query(AssignmentFile).filter(
        AssignmentFile.id == file_id,
        AssignmentFile.assignment_id == assignment_id,
    ).first()
    if not af:
        raise HTTPException(status_code=404, detail="Файл не найден")
    delete_file(af.file_path)
    db.delete(af)
    db.commit()


@router.get("/{assignment_id}/files/{file_id}/download")
def download_assignment_file(
    assignment_id: int,
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    af = db.query(AssignmentFile).filter(
        AssignmentFile.id == file_id,
        AssignmentFile.assignment_id == assignment_id,
    ).first()
    if not af:
        raise HTTPException(status_code=404, detail="Файл не найден")
    full_path = os.path.join(settings.UPLOAD_DIR, af.file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Файл отсутствует на сервере")
    return FileResponse(path=full_path, filename=af.original_name or os.path.basename(af.file_path))
