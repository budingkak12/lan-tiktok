from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Tag schemas
class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    id: str

    class Config:
        orm_mode = True

# Configuration schemas
class ConfigurationBase(BaseModel):
    key: str
    value: str

class ConfigurationCreate(ConfigurationBase):
    pass

class Configuration(ConfigurationBase):
    id: int

    class Config:
        orm_mode = True

# Media schemas
class MediaItemBase(BaseModel):
    type: str  # "image" or "video"
    path: str
    title: Optional[str] = None
    size: int

class MediaItemCreate(MediaItemBase):
    folder_id: Optional[str] = None

class MediaItem(MediaItemBase):
    id: str
    created_at: datetime
    liked: bool = False
    favorited: bool = False
    like_count: int = 0
    tags: List[Tag] = []

    class Config:
        orm_mode = True

# Folder schemas
class FolderBase(BaseModel):
    name: str
    path: str

class FolderCreate(FolderBase):
    parent_id: Optional[str] = None

class Folder(FolderBase):
    id: str
    created_at: datetime
    parent_id: Optional[str] = None

    class Config:
        orm_mode = True

# Extended folder schema with relationships
class FolderWithContents(Folder):
    subfolders: List[Folder] = []
    media_items: List[MediaItem] = []

    class Config:
        orm_mode = True
