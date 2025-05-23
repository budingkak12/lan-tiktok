from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
import os

from . import models, schemas

# Media CRUD operations
def get_media_items(db: Session, skip: int = 0, limit: int = 100, sort_by: str = "recent"):
    query = db.query(models.Media)
    
    if sort_by == "recent":
        query = query.order_by(desc(models.Media.created_at))
    elif sort_by == "popular":
        query = query.order_by(desc(models.Media.like_count))
    elif sort_by == "random":
        query = query.order_by(func.random())
    
    return query.offset(skip).limit(limit).all()

def get_media_item(db: Session, media_id: str):
    return db.query(models.Media).filter(models.Media.id == media_id).first()

def create_media_item(db: Session, media_item: schemas.MediaItemCreate):
    db_media = models.Media(
        type=media_item.type,
        path=media_item.path,
        title=media_item.title,
        size=media_item.size,
        folder_id=media_item.folder_id
    )
    db.add(db_media)
    db.commit()
    db.refresh(db_media)
    return db_media

def delete_media_item(db: Session, media_id: str):
    db_media = db.query(models.Media).filter(models.Media.id == media_id).first()
    if db_media:
        # Delete the file if it exists
        file_path = os.path.join(".", db_media.path.lstrip("/"))
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error deleting file: {e}")
        
        # Delete from database
        db.delete(db_media)
        db.commit()
        return {"message": "Media deleted successfully"}
    return {"message": "Media not found"}

def toggle_media_like(db: Session, media_id: str, liked: bool):
    db_media = db.query(models.Media).filter(models.Media.id == media_id).first()
    if db_media:
        # Update like count
        if liked and not db_media.liked:
            db_media.like_count += 1
        elif not liked and db_media.liked:
            db_media.like_count = max(0, db_media.like_count - 1)
        
        db_media.liked = liked
        db.commit()
        db.refresh(db_media)
        return db_media
    return None

def toggle_media_favorite(db: Session, media_id: str, favorited: bool):
    db_media = db.query(models.Media).filter(models.Media.id == media_id).first()
    if db_media:
        db_media.favorited = favorited
        db.commit()
        db.refresh(db_media)
        return db_media
    return None

# Tag CRUD operations
def get_tags(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Tag).offset(skip).limit(limit).all()

def create_tag(db: Session, tag: schemas.TagCreate):
    # Check if tag already exists
    existing_tag = db.query(models.Tag).filter(models.Tag.name == tag.name).first()
    if existing_tag:
        return existing_tag
    
    db_tag = models.Tag(name=tag.name)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag

def add_tag_to_media(db: Session, media_id: str, tag_id: str):
    db_media = db.query(models.Media).filter(models.Media.id == media_id).first()
    db_tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    
    if db_media and db_tag:
        # Check if tag is already associated with media
        if db_tag not in db_media.tags:
            db_media.tags.append(db_tag)
            db.commit()
        return {"message": "Tag added to media"}
    return {"message": "Media or tag not found"}

def remove_tag_from_media(db: Session, media_id: str, tag_id: str):
    db_media = db.query(models.Media).filter(models.Media.id == media_id).first()
    db_tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    
    if db_media and db_tag and db_tag in db_media.tags:
        db_media.tags.remove(db_tag)
        db.commit()
        return {"message": "Tag removed from media"}
    return {"message": "Media or tag not found or tag not associated with media"}

def search_media_by_tags(db: Session, tag_ids: List[str]):
    # Find media items that have ALL the specified tags
    if not tag_ids:
        return []
    
    # Start with all media
    query = db.query(models.Media)
    
    # For each tag, filter to only include media with that tag
    for tag_id in tag_ids:
        query = query.filter(models.Media.tags.any(models.Tag.id == tag_id))
    
    return query.all()

# Folder CRUD operations
def get_root_folders(db: Session):
    return db.query(models.Folder).filter(models.Folder.parent_id == None).all()

def get_folder(db: Session, folder_id: str):
    return db.query(models.Folder).filter(models.Folder.id == folder_id).first()

def get_subfolders(db: Session, parent_id: str):
    return db.query(models.Folder).filter(models.Folder.parent_id == parent_id).all()

def get_folder_media(db: Session, folder_id: str):
    return db.query(models.Media).filter(models.Media.folder_id == folder_id).all()

def create_folder(db: Session, folder: schemas.FolderCreate):
    db_folder = models.Folder(
        name=folder.name,
        path=folder.path,
        parent_id=folder.parent_id
    )
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder

def get_folder_breadcrumb(db: Session, folder_id: str):
    breadcrumb = []
    current_folder = get_folder(db, folder_id)
    
    while current_folder:
        breadcrumb.insert(0, current_folder)
        if current_folder.parent_id:
            current_folder = get_folder(db, current_folder.parent_id)
        else:
            break
    
    return breadcrumb
