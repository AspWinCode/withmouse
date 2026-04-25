from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from app.models.test import QuestionType


class QuestionOptionBase(BaseModel):
    text: str
    is_correct: bool = False
    order: int = 0


class QuestionOptionCreate(QuestionOptionBase):
    pass


class QuestionOptionOut(BaseModel):
    id: int
    text: str
    order: int

    model_config = {"from_attributes": True}


class QuestionOptionAdminOut(QuestionOptionOut):
    is_correct: bool


class QuestionBase(BaseModel):
    type: QuestionType
    text: str
    points: int = 1
    order: int = 0


class QuestionCreate(QuestionBase):
    options: List[QuestionOptionCreate] = []


class QuestionUpdate(BaseModel):
    type: Optional[QuestionType] = None
    text: Optional[str] = None
    points: Optional[int] = None
    order: Optional[int] = None
    options: Optional[List[QuestionOptionCreate]] = None


class QuestionOut(BaseModel):
    id: int
    type: QuestionType
    text: str
    points: int
    order: int
    options: List[QuestionOptionOut] = []

    model_config = {"from_attributes": True}


class QuestionAdminOut(QuestionOut):
    options: List[QuestionOptionAdminOut] = []


class TestBase(BaseModel):
    title: str
    description: Optional[str] = None
    max_attempts: int = 3
    is_published: bool = True
    profession_id: Optional[int] = None


class TestCreate(TestBase):
    questions: List[QuestionCreate] = []


class TestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    max_attempts: Optional[int] = None
    is_published: Optional[bool] = None
    profession_id: Optional[int] = None


class TestOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    max_attempts: int
    is_published: bool
    profession_id: Optional[int] = None
    questions: List[QuestionOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class TestAdminOut(TestOut):
    questions: List[QuestionAdminOut] = []


class TestListOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    max_attempts: int
    profession_id: Optional[int] = None
    question_count: int = 0

    model_config = {"from_attributes": True}


# Attempt schemas
class SubmitAnswer(BaseModel):
    question_id: int
    selected_options: List[int] = []
    open_answer: Optional[str] = None


class TestSubmit(BaseModel):
    answers: List[SubmitAnswer]


class TestAnswerOut(BaseModel):
    question_id: int
    selected_options: List[int]
    open_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    points_earned: float

    model_config = {"from_attributes": True}


class TestAttemptOut(BaseModel):
    id: int
    test_id: int
    score: float
    max_score: float
    is_completed: bool
    started_at: datetime
    completed_at: Optional[datetime] = None
    answers: List[TestAnswerOut] = []

    model_config = {"from_attributes": True}


class TestAttemptListOut(BaseModel):
    id: int
    test_id: int
    test_title: str
    score: float
    max_score: float
    is_completed: bool
    started_at: datetime

    model_config = {"from_attributes": True}
