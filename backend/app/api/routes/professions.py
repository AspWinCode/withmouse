from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from app.db.database import get_db
from app.core.deps import get_current_user, get_strict_admin
from app.core.files import save_upload_file, delete_file
from app.core.config import settings
from app.models.user import User
from app.models.profession import Profession, ProfessionImage
from app.schemas.profession import ProfessionCreate, ProfessionUpdate, ProfessionOut, ProfessionListOut

router = APIRouter(prefix="/professions", tags=["professions"])


@router.get("", response_model=List[ProfessionListOut])
def list_professions(
    published_only: bool = True,
    db: Session = Depends(get_db),
):
    q = db.query(Profession)
    if published_only:
        q = q.filter(Profession.is_published == 1)
    return q.order_by(Profession.id.desc()).all()


@router.get("/{profession_id}", response_model=ProfessionOut)
def get_profession(profession_id: int, db: Session = Depends(get_db)):
    p = db.query(Profession).filter(Profession.id == profession_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Профессия не найдена")
    return p


@router.post("", response_model=ProfessionOut, status_code=201)
def create_profession(
    data: ProfessionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    p = Profession(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.patch("/{profession_id}", response_model=ProfessionOut)
def update_profession(
    profession_id: int,
    data: ProfessionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    p = db.query(Profession).filter(Profession.id == profession_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Профессия не найдена")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{profession_id}", status_code=204)
def delete_profession(
    profession_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    p = db.query(Profession).filter(Profession.id == profession_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Профессия не найдена")
    db.delete(p)
    db.commit()


@router.post("/{profession_id}/images", response_model=ProfessionOut)
async def upload_profession_image(
    profession_id: int,
    file: UploadFile = File(...),
    order: int = Form(0),
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    p = db.query(Profession).filter(Profession.id == profession_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Профессия не найдена")

    file_path, _ = await save_upload_file(file, "professions/images", "image")
    img = ProfessionImage(profession_id=profession_id, file_path=file_path, order=order)
    db.add(img)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{profession_id}/images/{image_id}", status_code=204)
def delete_profession_image(
    profession_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    img = db.query(ProfessionImage).filter(
        ProfessionImage.id == image_id,
        ProfessionImage.profession_id == profession_id,
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    delete_file(img.file_path)
    db.delete(img)
    db.commit()


@router.post("/{profession_id}/video", response_model=ProfessionOut)
async def upload_profession_video(
    profession_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_strict_admin),
):
    p = db.query(Profession).filter(Profession.id == profession_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Профессия не найдена")

    if p.video_file:
        delete_file(p.video_file)

    file_path, _ = await save_upload_file(file, "professions/videos", "video")
    p.video_file = file_path
    db.commit()
    db.refresh(p)
    return p
