from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.submission import SubmissionStatus


class SubmissionCreate(BaseModel):
    assignment_id: int
    text_answer: Optional[str] = None


class SubmissionReview(BaseModel):
    status: SubmissionStatus
    score: Optional[float] = None
    comment: Optional[str] = None


class SubmissionOut(BaseModel):
    id: int
    student_id: int
    assignment_id: int
    text_answer: Optional[str] = None
    file_path: Optional[str] = None
    original_file_name: Optional[str] = None
    status: SubmissionStatus
    score: Optional[float] = None
    comment: Optional[str] = None
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SubmissionAdminOut(SubmissionOut):
    student_name: Optional[str] = None
    student_phone: Optional[str] = None
    assignment_title: Optional[str] = None
    assignment_max_score: Optional[int] = None
