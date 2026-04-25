from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.assignment import AssignmentType


class AssignmentFileOut(BaseModel):
    id: int
    file_path: str
    original_name: Optional[str] = None

    model_config = {"from_attributes": True}


class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    type: AssignmentType = AssignmentType.text
    max_score: int = 100
    is_published: bool = True
    profession_id: Optional[int] = None


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[AssignmentType] = None
    max_score: Optional[int] = None
    is_published: Optional[bool] = None
    profession_id: Optional[int] = None


class AssignmentOut(AssignmentBase):
    id: int
    files: List[AssignmentFileOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class AssignmentListOut(BaseModel):
    id: int
    title: str
    type: AssignmentType
    max_score: int
    profession_id: Optional[int] = None
    is_published: bool

    model_config = {"from_attributes": True}
