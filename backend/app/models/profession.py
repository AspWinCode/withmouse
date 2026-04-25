from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Profession(Base):
    __tablename__ = "professions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    short_description = Column(String(500))
    description = Column(Text)
    what_does = Column(Text)       # Чем занимается специалист
    skills = Column(Text)          # Навыки
    where_works = Column(Text)     # Где работает
    video_url = Column(String(500))
    video_file = Column(String(500))
    is_published = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    images = relationship("ProfessionImage", back_populates="profession", cascade="all, delete-orphan")
    tests = relationship("Test", back_populates="profession")
    assignments = relationship("Assignment", back_populates="profession")


class ProfessionImage(Base):
    __tablename__ = "profession_images"

    id = Column(Integer, primary_key=True, index=True)
    profession_id = Column(Integer, ForeignKey("professions.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(500), nullable=False)
    order = Column(Integer, default=0)

    profession = relationship("Profession", back_populates="images")
