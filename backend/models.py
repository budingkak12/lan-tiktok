from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Table
from sqlalchemy.orm import relationship
import datetime
import uuid

from .database import Base

# Association table for media-tag relationship
media_tags = Table(
    "media_tags",
    Base.metadata,
    Column("media_id", String, ForeignKey("media.id")),
    Column("tag_id", String, ForeignKey("tags.id"))
)

class Media(Base):
    __tablename__ = "media"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    type = Column(String)  # "image" or "video"
    path = Column(String)
    title = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    liked = Column(Boolean, default=False)
    favorited = Column(Boolean, default=False)
    like_count = Column(Integer, default=0)
    size = Column(Integer)  # File size in bytes
    folder_id = Column(String, ForeignKey("folders.id"), nullable=True)

    # Relationships
    tags = relationship("Tag", secondary=media_tags, back_populates="media_items")
    folder = relationship("Folder", back_populates="media_items")

class Tag(Base):
    __tablename__ = "tags"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, index=True)
    
    # Relationships
    media_items = relationship("Media", secondary=media_tags, back_populates="tags")

class Folder(Base):
    __tablename__ = "folders"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    path = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    parent_id = Column(String, ForeignKey("folders.id"), nullable=True)
    
    # Relationships
    subfolders = relationship("Folder", 
                             backref=ForeignKey("folders.id"),
                             remote_side=[id])
    media_items = relationship("Media", back_populates="folder")
