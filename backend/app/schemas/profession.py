from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ProfessionImageOut(BaseModel):
    id: int
    file_path: str
    order: int

    model_config = {"from_attributes": True}


class ProfessionBase(BaseModel):
    title: str
    short_description: Optional[str] = None
    description: Optional[str] = None
    what_does: Optional[str] = None
    skills: Optional[str] = None
    where_works: Optional[str] = None
    video_url: Optional[str] = None
    is_published: Optional[int] = 1


class ProfessionCreate(ProfessionBase):
    pass


class ProfessionUpdate(BaseModel):
    title: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    what_does: Optional[str] = None
    skills: Optional[str] = None
    where_works: Optional[str] = None
    video_url: Optional[str] = None
    is_published: Optional[int] = None


class ProfessionOut(ProfessionBase):
    id: int
    video_file: Optional[str] = None
    images: List[ProfessionImageOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfessionListOut(BaseModel):
    id: int
    title: str
    short_description: Optional[str] = None
    images: List[ProfessionImageOut] = []
    is_published: int

    model_config = {"from_attributes": True}
