from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.database import Base


class SubmissionStatus(str, enum.Enum):
    submitted = "submitted"         # Отправлено
    reviewing = "reviewing"         # На проверке
    accepted = "accepted"           # Принято
    revision = "revision"           # На доработку
    rejected = "rejected"           # Не зачтено


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    text_answer = Column(Text)
    file_path = Column(String(500))
    original_file_name = Column(String(255))
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.submitted, nullable=False)
    score = Column(Float)
    comment = Column(Text)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True))

    student = relationship("User", foreign_keys=[student_id], back_populates="submissions")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    assignment = relationship("Assignment", back_populates="submissions")
